import { randomUUID } from "node:crypto";
import { getPool, withDbRetry } from "../db.js";
import {
  BILLING_PLANS,
  getDefaultPlan,
  TRIAL_PLAN_CODE,
} from "../billing-plans.js";
import {
  buildTransferContent,
  normalizeBillingInterval,
  planChargeAmount,
} from "../billing-pricing.js";
import { parseListPagination, toPaginatedList } from "../list-pagination.js";
import { billingWriteBlocked } from "../billing-grace.js";

async function query(text, params = []) {
  return withDbRetry(async () => {
    const result = await getPool().query(text, params);
    return result.rows;
  });
}

async function queryOne(text, params = []) {
  return withDbRetry(async () => {
    const result = await getPool().query(text, params);
    return result.rows[0] || null;
  });
}

async function defaultSite() {
  return queryOne(`
    select
      s.id,
      s.name,
      s.code,
      s.public_slug as "publicSlug",
      s.status,
      s.billing_status as "billingStatus",
      s.trial_started_at as "trialStartedAt",
      s.trial_ends_at as "trialEndsAt",
      o.id as "organizationId",
      o.name as "organizationName",
      o.slug as "organizationSlug"
    from sites s
    join organizations o on o.id = s.organization_id
    where o.slug = 'default' and s.code = 'default'
    limit 1
  `);
}

async function resolveSiteId(siteId = null) {
  if (siteId) return siteId;
  const site = await defaultSite();
  if (!site?.id) {
    const error = new Error("Chưa có site mặc định. Hãy chạy migration site/billing.");
    error.code = "SITE_NOT_READY";
    error.statusCode = 503;
    throw error;
  }
  return site.id;
}

async function siteByPublicSlug(publicSlug) {
  if (!publicSlug) return null;
  return queryOne(
    `
      select
        s.id,
        s.name,
        s.code,
        s.public_slug as "publicSlug",
        s.status,
        s.billing_status as "billingStatus",
        s.trial_started_at as "trialStartedAt",
        s.trial_ends_at as "trialEndsAt",
        o.id as "organizationId",
        o.name as "organizationName",
        o.slug as "organizationSlug"
      from sites s
      join organizations o on o.id = s.organization_id
      where s.public_slug = $1 and s.status = 'active'
      limit 1
    `,
    [publicSlug],
  );
}

async function transaction(work) {
  return withDbRetry(async () => {
    const client = await getPool().connect();
    try {
      await client.query("begin");
      const result = await work(client);
      await client.query("commit");
      return result;
    } catch (error) {
      await client.query("rollback");
      throw error;
    } finally {
      client.release();
    }
  });
}

function withPlanConfig(plan = null) {
  if (!plan?.code) return plan;
  const configured = BILLING_PLANS.find((item) => item.code === plan.code);
  return configured ? { ...plan, ...configured } : plan;
}

function billingPlanOrder(code) {
  const index = BILLING_PLANS.findIndex((item) => item.code === code);
  return index === -1 ? BILLING_PLANS.length : index;
}

function normalizePlanBillingInput({ billingStatus, planCode, trialDays } = {}) {
  const effectivePlanCode = planCode || TRIAL_PLAN_CODE;
  if (effectivePlanCode === TRIAL_PLAN_CODE) {
    return {
      billingStatus: "active",
      planCode: effectivePlanCode,
      trialDays: 0,
    };
  }
  return {
    billingStatus: billingStatus || "trialing",
    planCode: effectivePlanCode,
    trialDays: trialDays ?? 30,
  };
}

async function audit(client, user, action, entityType, entityId, meta = {}) {
  await client.query(
    `
      insert into audit_logs (site_id, user_id, user_role, action, entity_type, entity_id, meta)
      values ($1, $2, $3, $4, $5, $6, $7::jsonb)
    `,
    [
      user.siteId || null,
      user.id,
      user.role,
      action,
      entityType,
      entityId,
      JSON.stringify(meta),
    ],
  );
}

async function listSites(userId = null) {
  return query(
    `
      select
        s.id,
        s.name,
        s.code,
        s.public_slug as "publicSlug",
        s.status,
        s.billing_status as "billingStatus",
        s.trial_started_at as "trialStartedAt",
        s.trial_ends_at as "trialEndsAt",
        o.id as "organizationId",
        o.name as "organizationName",
        o.slug as "organizationSlug",
        sm.role
      from sites s
      join organizations o on o.id = s.organization_id
      left join site_memberships sm
        on sm.site_id = s.id
        and sm.is_active = true
        and ($1::uuid is not null and sm.user_id = $1)
      where $1::uuid is null or sm.user_id = $1
      order by o.name, s.name
    `,
    [userId],
  );
}

async function assertPlatformAdmin(user) {
  if (!user?.id) {
    const error = new Error("Cần đăng nhập để quản lý hệ thống.");
    error.statusCode = 401;
    error.code = "AUTH_REQUIRED";
    throw error;
  }
  const row = await queryOne(
    `
      select is_platform_admin as "isPlatformAdmin"
      from users
      where id = $1 and is_active = true
      limit 1
    `,
    [user.id],
  );
  if (row?.isPlatformAdmin) return true;

  const error = new Error("Tài khoản hiện tại không có quyền quản trị hệ thống.");
  error.statusCode = 403;
  error.code = "PLATFORM_FORBIDDEN";
  throw error;
}

async function listPlatformSites() {
  return query(
    `
      select
        s.id,
        s.name,
        s.code,
        s.public_slug as "publicSlug",
        s.status,
        s.billing_status as "billingStatus",
        s.trial_started_at as "trialStartedAt",
        s.trial_ends_at as "trialEndsAt",
        o.name as "organizationName",
        o.slug as "organizationSlug",
        coalesce((
          select count(*)::int
          from site_memberships sm
          join users u on u.id = sm.user_id
          where sm.site_id = s.id and sm.is_active = true and u.is_active = true
        ), 0) as "userCount",
        coalesce((select count(*)::int from customers c where c.site_id = s.id and c.is_active = true), 0) as "customerCount",
        coalesce((select count(*)::int from vehicles v where v.site_id = s.id and v.is_active = true), 0) as "vehicleCount",
        coalesce((select count(*)::int from warehouses w where w.site_id = s.id and w.is_active = true), 0) as "warehouseCount",
        coalesce((
          select row_to_json(item)
          from (
            select
              sub.id,
              sub.status,
              sub.current_period_end as "currentPeriodEnd",
              sub.trial_ends_at as "trialEndsAt",
              p.code as "planCode",
              p.name as "planName"
            from subscriptions sub
            left join plans p on p.id = sub.plan_id
            where sub.site_id = s.id
            order by sub.created_at desc
            limit 1
          ) item
        ), '{}'::json) as subscription,
        s.created_at as "createdAt",
        s.updated_at as "updatedAt"
      from sites s
      join organizations o on o.id = s.organization_id
      order by s.created_at desc
    `,
  );
}

const RESERVED_SITE_SLUGS = new Set([
  "admin",
  "api",
  "bao-cao",
  "cai-dat",
  "dang-nhap",
  "health",
  "nhap-hang",
  "quan-ly",
  "ready",
  "site-admin",
  "tong-quan",
  "xuat-hang",
]);

function reservedSlugError(slug) {
  const error = new Error(`Slug ${slug} được hệ thống giữ lại.`);
  error.statusCode = 409;
  error.code = "SITE_SLUG_RESERVED";
  return error;
}

function siteSlugExistsError(slug) {
  const error = new Error(`Site này đã tồn tại (${slug}).`);
  error.statusCode = 409;
  error.code = "SITE_SLUG_EXISTS";
  return error;
}

function slugifySiteName(value = "") {
  return value
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

async function createPlatformSite(data, user) {
  const slug = data.slug || slugifySiteName(data.name);
  if (RESERVED_SITE_SLUGS.has(slug) || slug.startsWith("_")) {
    throw reservedSlugError(slug);
  }

  return transaction(async (client) => {
    const existing = await client.query(
      "select 1 from sites where public_slug = $1 limit 1",
      [slug],
    );
    if (existing.rowCount) throw siteSlugExistsError(slug);

    const admin = await client.query(
      `
        select id
        from users
        where phone = $1 and is_active = true
        limit 1
      `,
      [data.adminPhone],
    );
    if (!admin.rowCount) {
      const error = new Error("Không tìm thấy admin phone này. Tạo user trước rồi tạo site.");
      error.statusCode = 404;
      error.code = "ADMIN_USER_NOT_FOUND";
      throw error;
    }

    const planBilling = normalizePlanBillingInput(data);
    const organization = await client.query(
      `
        insert into organizations (name, slug, status)
        values ($1, $2, 'active')
        on conflict (slug) do update
        set name = excluded.name,
            status = 'active',
            updated_at = now()
        returning id
      `,
      [data.name, slug],
    );
    const site = await client.query(
      `
        insert into sites (
          organization_id,
          name,
          code,
          public_slug,
          status,
          billing_status,
          trial_started_at,
          trial_ends_at
        )
        values (
          $1,
          $2,
          'main',
          $3,
          'active',
          $4,
          now(),
          case
            when $4 = 'trialing' then now() + ($5::int * interval '1 day')
            else now() + interval '100 years'
          end
        )
        returning id, name, code, public_slug, status, billing_status, trial_started_at, trial_ends_at
      `,
      [
        organization.rows[0].id,
        data.name,
        slug,
        planBilling.billingStatus,
        planBilling.trialDays,
      ],
    );

    await client.query(
      `
        insert into site_memberships (site_id, user_id, role, is_active)
        values ($1, $2, 'admin', true)
        on conflict (site_id, user_id) do update
        set role = 'admin',
            is_active = true,
            updated_at = now()
      `,
      [site.rows[0].id, admin.rows[0].id],
    );
    await client.query(
      `
        insert into warehouses (site_id, name, code)
        values ($1, 'Kho chinh', 'MAIN')
      `,
      [site.rows[0].id],
    );
    await client.query(
      `
        insert into subscriptions (
          site_id,
          plan_id,
          status,
          current_period_start,
          current_period_end,
          trial_ends_at,
          provider
        )
        select
          $1,
          p.id,
          $2,
          now(),
          case
            when $2 = 'trialing' then now() + ($3::int * interval '1 day')
            else now() + interval '100 years'
          end,
          case
            when $2 = 'trialing' then now() + ($3::int * interval '1 day')
            else null
          end,
          case
            when $4 = $5 then 'free'
            else 'manual_qr'
          end
        from plans p
        where p.code = $4
        limit 1
      `,
      [
        site.rows[0].id,
        planBilling.billingStatus,
        planBilling.trialDays,
        planBilling.planCode,
        TRIAL_PLAN_CODE,
      ],
    );
    await audit(client, user, "create", "site", site.rows[0].id, {
      adminPhone: data.adminPhone,
      publicSlug: slug,
    });

    return {
      id: site.rows[0].id,
      name: site.rows[0].name,
      code: site.rows[0].code,
      publicSlug: site.rows[0].public_slug,
      status: site.rows[0].status,
      billingStatus: site.rows[0].billing_status,
      trialStartedAt: site.rows[0].trial_started_at,
      trialEndsAt: site.rows[0].trial_ends_at,
    };
  });
}

async function updatePlatformSite(siteId, data, user) {
  return transaction(async (client) => {
    const current = await client.query(
      `
        select
          id,
          billing_status as "billingStatus",
          trial_ends_at as "trialEndsAt",
          coalesce((
            select p.code
            from subscriptions sub
            left join plans p on p.id = sub.plan_id
            where sub.site_id = sites.id
            order by sub.created_at desc
            limit 1
          ), $2) as "planCode"
        from sites
        where id = $1
        limit 1
      `,
      [siteId, TRIAL_PLAN_CODE],
    );
    if (!current.rowCount) return null;

    let planId = null;
    if (data.planCode) {
      const plan = await client.query(
        `
          select id
          from plans
          where code = $1 and is_active = true
          limit 1
        `,
        [data.planCode],
      );
      if (!plan.rowCount) {
        const error = new Error("Không tìm thấy gói thanh toán.");
        error.statusCode = 404;
        error.code = "PLAN_NOT_FOUND";
        throw error;
      }
      planId = plan.rows[0].id;
    }

    const targetPlanCode =
      data.planCode || current.rows[0].planCode || TRIAL_PLAN_CODE;
    const planBilling = normalizePlanBillingInput({
      billingStatus: data.billingStatus || current.rows[0].billingStatus,
      planCode: targetPlanCode,
      trialDays: data.trialDays,
    });
    const updatesBilling =
      Boolean(data.planCode) ||
      Boolean(data.billingStatus) ||
      Boolean(data.trialEndsAt) ||
      data.trialDays != null;
    const planIsFree = updatesBilling && planBilling.planCode === TRIAL_PLAN_CODE;

    const updated = await client.query(
      `
        update sites
        set name = coalesce($2, name),
            status = coalesce($3, status),
            billing_status = coalesce($4, billing_status),
            trial_ends_at = case
              when $7::boolean then now() + interval '100 years'
              when $5::date is not null then $5::date + interval '1 day' - interval '1 second'
              when $6::int is not null then now() + ($6::int * interval '1 day')
              else trial_ends_at
            end,
            updated_at = now()
        where id = $1
        returning
          id,
          name,
          code,
          public_slug as "publicSlug",
          status,
          billing_status as "billingStatus",
          trial_started_at as "trialStartedAt",
          trial_ends_at as "trialEndsAt",
          updated_at as "updatedAt"
      `,
      [
        siteId,
        data.name || null,
        data.status || null,
        updatesBilling ? planBilling.billingStatus : null,
        planIsFree ? null : data.trialEndsAt || null,
        planIsFree ? null : data.trialDays ?? null,
        planIsFree,
      ],
    );

    const site = updated.rows[0];
    if (updatesBilling) {
      const subscription = await client.query(
        `
          select id
          from subscriptions
          where site_id = $1
          order by created_at desc
          limit 1
        `,
        [siteId],
      );
      const subscriptionStatus = planBilling.billingStatus;
      const trialEndsAt = site.trialEndsAt || current.rows[0].trialEndsAt;
      const subscriptionTrialEndsAt =
        !planIsFree &&
        (data.trialEndsAt ||
          data.trialDays != null ||
          subscriptionStatus === "trialing")
          ? trialEndsAt
          : null;

      if (subscription.rowCount) {
        await client.query(
          `
            update subscriptions
            set plan_id = coalesce($2, plan_id),
                status = coalesce($3, status),
                trial_ends_at = case
                  when $5::boolean then null
                  when $4::timestamptz is not null then $4::timestamptz
                  else trial_ends_at
                end,
                current_period_end = case
                  when $5::boolean then now() + interval '100 years'
                  when $4::timestamptz is not null and coalesce($3, status) = 'trialing'
                    then $4::timestamptz
                  else current_period_end
                end,
                updated_at = now()
            where id = $1
          `,
          [
            subscription.rows[0].id,
            planId,
            subscriptionStatus,
            subscriptionTrialEndsAt,
            planIsFree,
          ],
        );
      } else if (planId) {
        await client.query(
          `
            insert into subscriptions (
              site_id,
              plan_id,
              status,
              current_period_start,
              current_period_end,
              trial_ends_at,
              provider
            )
            values (
              $1,
              $2,
              $3,
              now(),
              case
                when $5::boolean then now() + interval '100 years'
                else $4::timestamptz
              end,
              case
                when $5::boolean then null
                else $4::timestamptz
              end,
              case
                when $5::boolean then 'free'
                else 'manual_qr'
              end
            )
          `,
          [siteId, planId, subscriptionStatus, trialEndsAt, planIsFree],
        );
      }
    }

    await audit(client, user, "update", "site", siteId, data);
    return site || null;
  });
}

async function platformBillingDashboard() {
  const [summary, monthlyRevenue, pendingPayments, recentPayments] =
    await Promise.all([
      queryOne(
        `
          select
            coalesce(sum(amount) filter (where status = 'succeeded'), 0)::float as "totalPaid",
            coalesce(sum(amount) filter (
              where status = 'succeeded'
                and paid_at >= date_trunc('month', now())
            ), 0)::float as "currentMonthPaid",
            count(*) filter (where status = 'awaiting_review')::int as "pendingReviewCount",
            count(*) filter (where status = 'succeeded')::int as "paidCount"
          from payments
        `,
      ),
      query(
        `
          select
            to_char(date_trunc('month', paid_at), 'YYYY-MM') as month,
            coalesce(sum(amount), 0)::float as amount,
            count(*)::int as count
          from payments
          where status = 'succeeded'
            and paid_at is not null
            and paid_at >= date_trunc('month', now()) - interval '11 months'
          group by date_trunc('month', paid_at)
          order by month desc
        `,
      ),
      query(
        `
          select
            p.id,
            p.site_id as "siteId",
            s.name as "siteName",
            s.public_slug as "siteSlug",
            p.invoice_id as "invoiceId",
            p.amount::float,
            p.currency,
            p.status,
            p.meta,
            p.created_at as "createdAt",
            bi.status as "invoiceStatus",
            bi.due_date as "dueDate"
          from payments p
          join sites s on s.id = p.site_id
          join billing_invoices bi on bi.id = p.invoice_id
          where p.status = 'awaiting_review'
          order by p.created_at desc
        `,
      ),
      query(
        `
          select
            p.id,
            p.site_id as "siteId",
            s.name as "siteName",
            s.public_slug as "siteSlug",
            p.invoice_id as "invoiceId",
            p.amount::float,
            p.currency,
            p.status,
            p.paid_at as "paidAt",
            p.meta,
            p.created_at as "createdAt"
          from payments p
          join sites s on s.id = p.site_id
          where p.status in ('succeeded', 'failed')
          order by coalesce(p.paid_at, p.created_at) desc
          limit 20
        `,
      ),
    ]);

  return {
    monthlyRevenue,
    pendingPayments,
    recentPayments,
    summary: {
      currentMonthPaid: Number(summary?.currentMonthPaid || 0),
      paidCount: Number(summary?.paidCount || 0),
      pendingReviewCount: Number(summary?.pendingReviewCount || 0),
      totalPaid: Number(summary?.totalPaid || 0),
    },
  };
}

async function billingSummary(siteId) {
  const resolvedSiteId = await resolveSiteId(siteId);
  return queryOne(
    `
      select
        s.id as "siteId",
        s.code as "siteCode",
        s.public_slug as "siteSlug",
        s.name as "siteName",
        s.billing_status as "billingStatus",
        s.trial_started_at as "trialStartedAt",
        s.trial_ends_at as "trialEndsAt",
        coalesce((
          select row_to_json(item)
          from (
            select
              sub.id,
              sub.status,
              sub.current_period_start as "currentPeriodStart",
              sub.current_period_end as "currentPeriodEnd",
              sub.trial_ends_at as "trialEndsAt",
              sub.cancel_at_period_end as "cancelAtPeriodEnd",
              p.code as "planCode",
              p.name as "planName",
              p.price_monthly::float as "priceMonthly",
              p.currency,
              p.max_customers as "maxCustomers",
              p.max_users as "maxUsers",
              p.max_vehicles as "maxVehicles",
              p.max_warehouses as "maxWarehouses"
            from subscriptions sub
            left join plans p on p.id = sub.plan_id
            where sub.site_id = s.id
            order by sub.created_at desc
            limit 1
          ) item
        ), '{}'::json) as subscription,
        coalesce((
          select json_agg(row_to_json(item) order by item."createdAt" desc)
          from (
            select
              coalesce(pay.id, bi.id) as id,
              bi.id as "invoiceId",
              pay.id as "paymentId",
              coalesce(pay.amount::float, bi.amount::float) as amount,
              coalesce(pay.currency, bi.currency) as currency,
              case
                when pay.status = 'succeeded' then 'paid'
                when pay.status = 'awaiting_review' then 'pending'
                when pay.status = 'failed' then 'failed'
                else bi.status
              end as status,
              bi.status as "invoiceStatus",
              bi.due_date as "dueDate",
              coalesce(pay.paid_at, bi.paid_at) as "paidAt",
              coalesce(pay.created_at, bi.created_at) as "createdAt",
              coalesce(pay.meta->>'planCode', sub_plan.code) as "planCode",
              coalesce(pay_plan.name, sub_plan.name) as "planName",
              pay.status as "paymentStatus",
              pay.meta as "paymentMeta"
            from billing_invoices bi
            left join subscriptions sub on sub.id = bi.subscription_id
            left join plans sub_plan on sub_plan.id = sub.plan_id
            left join payments pay on pay.invoice_id = bi.id
            left join plans pay_plan on pay_plan.code = pay.meta->>'planCode'
            where bi.site_id = s.id
              and (
                pay.id is not null
                or not exists (
                  select 1 from payments existing_pay
                  where existing_pay.invoice_id = bi.id
                )
              )
            order by coalesce(pay.created_at, bi.created_at) desc
            limit 100
          ) item
        ), '[]'::json) as invoices,
        coalesce((
          select row_to_json(item)
          from (
            select
              bi.id,
              bi.amount::float,
              bi.currency,
              bi.status,
              bi.due_date as "dueDate",
              bi.paid_at as "paidAt",
              bi.created_at as "createdAt"
            from billing_invoices bi
            where bi.site_id = s.id and bi.status in ('open', 'pending')
            order by bi.created_at desc
            limit 1
          ) item
        ), null) as "openInvoice",
        coalesce((
          select row_to_json(item)
          from (
            select
              p.id,
              p.invoice_id as "invoiceId",
              p.amount::float,
              p.currency,
              p.status,
              p.paid_at as "paidAt",
              p.meta,
              p.created_at as "createdAt"
            from payments p
            join billing_invoices bi on bi.id = p.invoice_id
            where p.site_id = s.id
              and bi.status in ('open', 'pending')
              and p.status in ('pending', 'awaiting_review')
            order by p.created_at desc
            limit 1
          ) item
        ), null) as "pendingPayment",
        (
          select count(*)::int
          from site_memberships sm
          where sm.site_id = s.id and sm.is_active = true
        ) as "userCount",
        (
          select count(*)::int
          from vehicles v
          where v.site_id = s.id and v.is_active = true
        ) as "vehicleCount",
        (
          select count(*)::int
          from customers c
          where c.site_id = s.id and c.is_active = true
        ) as "customerCount",
        (
          select count(*)::int
          from warehouses w
          where w.site_id = s.id and w.is_active = true
        ) as "warehouseCount"
      from sites s
      where s.id = $1
    `,
    [resolvedSiteId],
  );
}

async function listPlans() {
  const rows = await query(`
    select
      id,
      code,
      name,
      price_monthly::float as "priceMonthly",
      currency,
      max_customers as "maxCustomers",
      max_users as "maxUsers",
      max_vehicles as "maxVehicles",
      max_warehouses as "maxWarehouses",
      max_receipts_per_month as "maxReceiptsPerMonth"
    from plans
    where is_active = true
    order by price_monthly
  `);
  return rows
    .map((plan) => ({
      ...plan,
      ...(BILLING_PLANS.find((item) => item.code === plan.code) || {}),
    }))
    .filter((plan) => BILLING_PLANS.some((item) => item.code === plan.code))
    .sort((a, b) => billingPlanOrder(a.code) - billingPlanOrder(b.code));
}

async function resolveBillingPlan(client, siteId, planCode = null) {
  const subscription = await client.query(
    `
      select
        sub.id,
        sub.plan_id as "planId",
        sub.status,
        p.code,
        p.name,
        p.price_monthly::float as "priceMonthly",
        p.currency,
        p.max_customers as "maxCustomers",
        p.max_users as "maxUsers",
        p.max_vehicles as "maxVehicles",
        p.max_warehouses as "maxWarehouses"
      from subscriptions sub
      left join plans p on p.id = sub.plan_id
      where sub.site_id = $1
      order by sub.created_at desc
      limit 1
    `,
    [siteId],
  );
  const current = subscription.rows[0];
  if (planCode) {
    const plan = await client.query(
      `
        select
          id,
          code,
          name,
          price_monthly::float as "priceMonthly",
          currency,
          max_customers as "maxCustomers",
          max_users as "maxUsers",
          max_vehicles as "maxVehicles",
          max_warehouses as "maxWarehouses"
        from plans
        where code = $1 and is_active = true
        limit 1
      `,
      [planCode],
    );
    if (!plan.rows[0]) {
      const error = new Error("Không tìm thấy gói thanh toán.");
      error.code = "NOT_FOUND";
      error.statusCode = 404;
      throw error;
    }
    return { plan: withPlanConfig(plan.rows[0]), subscriptionId: current?.id || null };
  }
  if (current?.priceMonthly != null && current.code !== "starter") {
    return {
      plan: withPlanConfig({
        code: current.code,
        currency: current.currency,
        id: current.planId,
        maxCustomers: current.maxCustomers,
        maxUsers: current.maxUsers,
        maxVehicles: current.maxVehicles,
        maxWarehouses: current.maxWarehouses,
        name: current.name,
        priceMonthly: current.priceMonthly,
      }),
      subscriptionId: current.id,
    };
  }
  const fallback = await client.query(
    `
      select
        id,
        code,
        name,
        price_monthly::float as "priceMonthly",
        currency,
        max_customers as "maxCustomers",
        max_users as "maxUsers",
        max_vehicles as "maxVehicles",
        max_warehouses as "maxWarehouses"
      from plans
      where code = $1 and is_active = true
      limit 1
    `,
    [TRIAL_PLAN_CODE],
  );
  if (!fallback.rows[0]) {
    const catalogPlan = getDefaultPlan();
    if (!catalogPlan) {
      const error = new Error("Chưa cấu hình gói thanh toán.");
      error.code = "NOT_FOUND";
      error.statusCode = 404;
      throw error;
    }
    return { plan: catalogPlan, subscriptionId: current?.id || null };
  }
  return { plan: withPlanConfig(fallback.rows[0]), subscriptionId: current?.id || null };
}

async function createBillingCheckout(siteId, user, options = {}) {
  const planCode = options.planCode || null;
  const billingInterval = normalizeBillingInterval(options.billingInterval);
  const resolvedSiteId = await resolveSiteId(siteId);
  return transaction(async (client) => {
    const siteResult = await client.query(
      `
        select id, code, name, billing_status as "billingStatus"
        from sites
        where id = $1
        limit 1
      `,
      [resolvedSiteId],
    );
    const site = siteResult.rows[0];
    if (!site) {
      const error = new Error("Không tìm thấy site.");
      error.code = "SITE_NOT_FOUND";
      error.statusCode = 404;
      throw error;
    }

    const openInvoiceResult = await client.query(
      `
        select
          id,
          amount::float,
          currency,
          status,
          due_date as "dueDate",
          paid_at as "paidAt",
          created_at as "createdAt"
        from billing_invoices
        where site_id = $1 and status in ('open', 'pending')
        order by created_at desc
        limit 1
      `,
      [resolvedSiteId],
    );
    let invoice = openInvoiceResult.rows[0];
    if (invoice?.status === "pending") {
      const error = new Error(
        "Hóa đơn đang chờ duyệt. Vui lòng đợi admin xác nhận thanh toán.",
      );
      error.code = "INVOICE_PENDING_REVIEW";
      error.statusCode = 409;
      throw error;
    }
    const { plan, subscriptionId } = await resolveBillingPlan(
      client,
      resolvedSiteId,
      planCode,
    );
    const chargeAmount = planChargeAmount(plan.priceMonthly, billingInterval);
    const currency = plan.currency || "VND";
    if (chargeAmount <= 0) {
      if (invoice?.id) {
        await client.query(
          `
            update payments
            set status = 'canceled',
                updated_at = now()
            where invoice_id = $1
              and status = 'pending'
          `,
          [invoice.id],
        );
        await client.query(
          `
            update billing_invoices
            set status = 'void',
                updated_at = now()
            where id = $1
              and status = 'open'
          `,
          [invoice.id],
        );
      }

      if (subscriptionId) {
        await client.query(
          `
            update subscriptions
            set status = 'active',
                plan_id = coalesce($2, plan_id),
                current_period_start = now(),
                current_period_end = now() + interval '100 years',
                trial_ends_at = null,
                updated_at = now()
            where id = $1
          `,
          [subscriptionId, plan.id || null],
        );
      } else if (plan.id) {
        await client.query(
          `
            insert into subscriptions (
              site_id,
              plan_id,
              status,
              current_period_start,
              current_period_end,
              provider
            )
            values ($1, $2, 'active', now(), now() + interval '100 years', 'free')
          `,
          [resolvedSiteId, plan.id],
        );
      }

      await client.query(
        `
          update sites
          set billing_status = 'active',
              trial_ends_at = now() + interval '100 years',
              updated_at = now()
          where id = $1
        `,
        [resolvedSiteId],
      );
      await audit(client, user, "billing.free_checkout", "site", resolvedSiteId, {
        billingInterval,
        planCode: plan.code,
      });

      return {
        billingInterval,
        freeCheckout: true,
        invoice: null,
        payment: null,
        plan,
        siteCode: site.code,
        siteName: site.name,
      };
    }

    const basePaymentMeta = {
      billingInterval,
      planCode: plan.code,
      ...(options.transferContent
        ? { transferContent: options.transferContent }
        : {}),
    };

    const paymentDueDate = (() => {
      const due = new Date();
      due.setDate(due.getDate() + 7);
      return due.toISOString().slice(0, 10);
    })();

    if (!invoice) {
      const created = await client.query(
        `
          insert into billing_invoices (
            site_id,
            subscription_id,
            amount,
            currency,
            status,
            due_date,
            provider
          )
          values ($1, $2, $3, $4, 'open', $5, 'manual_qr')
          returning
            id,
            amount::float,
            currency,
            status,
            due_date as "dueDate",
            paid_at as "paidAt",
            created_at as "createdAt"
        `,
        [
          resolvedSiteId,
          subscriptionId,
          chargeAmount,
          currency,
          paymentDueDate,
        ],
      );
      invoice = created.rows[0];
      await audit(client, user, "billing.checkout", "billing_invoice", invoice.id, {
        amount: chargeAmount,
        billingInterval,
        planCode: plan.code,
      });
    } else {
      const updatedInvoice = await client.query(
        `
          update billing_invoices
          set amount = $2,
              subscription_id = coalesce($3, subscription_id),
              currency = $4,
              due_date = $5,
              updated_at = now()
          where id = $1
            and status = 'open'
          returning
            id,
            amount::float,
            currency,
            status,
            due_date as "dueDate",
            paid_at as "paidAt",
            created_at as "createdAt"
        `,
        [invoice.id, chargeAmount, subscriptionId, currency, paymentDueDate],
      );
      invoice = updatedInvoice.rows[0] || invoice;
    }

    const pendingPaymentResult = await client.query(
      `
        select
          id,
          invoice_id as "invoiceId",
          amount::float,
          currency,
          status,
          paid_at as "paidAt",
          meta,
          created_at as "createdAt"
        from payments
        where site_id = $1
          and invoice_id = $2
          and status in ('pending', 'awaiting_review')
        order by created_at desc
        limit 1
      `,
      [resolvedSiteId, invoice.id],
    );
    let payment = pendingPaymentResult.rows[0];
    if (
      payment &&
      (payment.status === "pending" || payment.status === "awaiting_review")
    ) {
      const updatedPayment = await client.query(
        `
          update payments
          set status = 'pending',
              amount = $2,
              currency = $3,
              meta = $4::jsonb,
              updated_at = now()
          where id = $1
          returning
            id,
            invoice_id as "invoiceId",
            amount::float,
            currency,
            status,
            paid_at as "paidAt",
            meta,
            created_at as "createdAt"
        `,
        [
          payment.id,
          chargeAmount,
          currency,
          JSON.stringify({
            ...basePaymentMeta,
            transferContent:
              basePaymentMeta.transferContent ||
              buildTransferContent({
                paymentId: payment.id,
                planCode: plan.code,
                siteCode: site.code,
              }),
          }),
        ],
      );
      payment = updatedPayment.rows[0];
    } else if (!payment) {
      const createdPaymentId = randomUUID();
      const transferContent =
        basePaymentMeta.transferContent ||
        buildTransferContent({
          paymentId: createdPaymentId,
          planCode: plan.code,
          siteCode: site.code,
        });
      const createdPayment = await client.query(
        `
          insert into payments (
            id,
            site_id,
            invoice_id,
            provider,
            amount,
            currency,
            status,
            meta
          )
          values ($1, $2, $3, 'manual_qr', $4, $5, 'pending', $6::jsonb)
          returning
            id,
            invoice_id as "invoiceId",
            amount::float,
            currency,
            status,
            paid_at as "paidAt",
            meta,
            created_at as "createdAt"
        `,
        [
          createdPaymentId,
          resolvedSiteId,
          invoice.id,
          chargeAmount,
          currency,
          JSON.stringify({
            ...basePaymentMeta,
            transferContent,
          }),
        ],
      );
      payment = createdPayment.rows[0];
    }

    return {
      billingInterval,
      invoice,
      payment,
      plan,
      siteCode: site.code,
      siteName: site.name,
    };
  });
}

async function confirmBillingPayment(paymentId, siteId, user) {
  const resolvedSiteId = await resolveSiteId(siteId);
  return transaction(async (client) => {
    const paymentResult = await client.query(
      `
        select
          p.id,
          p.site_id as "siteId",
          p.invoice_id as "invoiceId",
          p.amount::float,
          p.currency,
          p.status,
          p.meta,
          p.created_at as "createdAt",
          bi.status as "invoiceStatus",
          bi.due_date as "invoiceDueDate",
          s.code as "siteCode",
          s.name as "siteName"
        from payments p
        join billing_invoices bi on bi.id = p.invoice_id
        join sites s on s.id = p.site_id
        where p.id = $1 and p.site_id = $2
        limit 1
      `,
      [paymentId, resolvedSiteId],
    );
    const payment = paymentResult.rows[0];
    if (!payment) {
      const error = new Error("Không tìm thấy giao dịch thanh toán.");
      error.code = "NOT_FOUND";
      error.statusCode = 404;
      throw error;
    }
    if (payment.status === "awaiting_review") {
      const existing = await client.query(
        `
          select
            id,
            site_id as "siteId",
            invoice_id as "invoiceId",
            amount::float,
            currency,
            status,
            paid_at as "paidAt",
            meta,
            created_at as "createdAt"
          from payments
          where id = $1
        `,
        [paymentId],
      );
      return {
        ...payment,
        ...existing.rows[0],
      };
    }
    if (payment.status !== "pending") {
      const error = new Error("Giao dịch không thể xác nhận ở trạng thái hiện tại.");
      error.code = "INVALID_STATE";
      error.statusCode = 409;
      throw error;
    }
    if (payment.invoiceStatus !== "open") {
      const error = new Error("Hóa đơn không còn chờ thanh toán.");
      error.code = "INVALID_STATE";
      error.statusCode = 409;
      throw error;
    }

    const updated = await client.query(
      `
        update payments
        set status = 'awaiting_review',
            meta = meta || jsonb_build_object(
              'confirmedAt', to_jsonb(now()),
              'confirmedBy', $2::text
            ),
            updated_at = now()
        where id = $1
        returning
          id,
          invoice_id as "invoiceId",
          amount::float,
          currency,
          status,
          paid_at as "paidAt",
          meta,
          created_at as "createdAt"
      `,
      [paymentId, user.name || user.id],
    );
    await client.query(
      `
        update billing_invoices
        set status = 'pending',
            updated_at = now()
        where id = $1
          and status = 'open'
      `,
      [payment.invoiceId],
    );
    await audit(client, user, "billing.confirm", "payment", paymentId, {});
    return {
      ...payment,
      ...updated.rows[0],
    };
  });
}

async function approveBillingPayment(paymentId, user) {
  return transaction(async (client) => {
    const paymentResult = await client.query(
      `
        select
          p.id,
          p.site_id as "siteId",
          p.invoice_id as "invoiceId",
          p.amount,
          p.currency,
          p.status,
          p.meta,
          bi.status as "invoiceStatus",
          bi.subscription_id as "subscriptionId"
        from payments p
        join billing_invoices bi on bi.id = p.invoice_id
        where p.id = $1
        limit 1
      `,
      [paymentId],
    );
    const payment = paymentResult.rows[0];
    if (!payment) {
      const error = new Error("Không tìm thấy giao dịch thanh toán.");
      error.code = "NOT_FOUND";
      error.statusCode = 404;
      throw error;
    }
    if (payment.status === "succeeded") {
      return billingSummary(payment.siteId);
    }
    if (payment.status !== "awaiting_review") {
      const error = new Error("Chỉ duyệt giao dịch đã được khách báo chuyển khoản.");
      error.code = "INVALID_STATE";
      error.statusCode = 409;
      throw error;
    }
    if (payment.invoiceStatus !== "pending") {
      const error = new Error("Chỉ duyệt hóa đơn đang chờ xác nhận.");
      error.code = "INVALID_STATE";
      error.statusCode = 409;
      throw error;
    }

    const paidAt = new Date();
    await client.query(
      `
        update payments
        set status = 'succeeded',
            paid_at = $2,
            meta = meta || jsonb_build_object('approvedAt', to_jsonb(now()), 'approvedBy', $3::text),
            updated_at = now()
        where id = $1
      `,
      [paymentId, paidAt, user.name || user.id],
    );
    await client.query(
      `
        update billing_invoices
        set status = 'paid',
            paid_at = $2,
            updated_at = now()
        where id = $1
      `,
      [payment.invoiceId, paidAt],
    );
    await client.query(
      `
        update sites
        set billing_status = 'active',
            updated_at = now()
        where id = $1
      `,
      [payment.siteId],
    );

    const approvedPlanCode = payment.meta?.planCode || TRIAL_PLAN_CODE;
    const approvedPlan = await client.query(
      `
        select id
        from plans
        where code = $1 and is_active = true
        limit 1
      `,
      [approvedPlanCode],
    );
    const approvedPlanId = approvedPlan.rows[0]?.id || null;
    const billingInterval = normalizeBillingInterval(payment.meta?.billingInterval);
    const periodInterval =
      billingInterval === "yearly" ? "12 months" : "1 month";

    if (payment.subscriptionId) {
      await client.query(
        `
          update subscriptions
          set status = 'active',
              plan_id = coalesce($3, plan_id),
              current_period_start = $4::timestamptz,
              current_period_end = $4::timestamptz + ($2::interval),
              trial_ends_at = null,
              updated_at = now()
          where id = $1
        `,
        [payment.subscriptionId, periodInterval, approvedPlanId, paidAt],
      );
    } else {
      if (approvedPlanId) {
        await client.query(
          `
            insert into subscriptions (
              site_id,
              plan_id,
              status,
              current_period_start,
              current_period_end,
              provider
            )
            values ($1, $2, 'active', $4::timestamptz, $4::timestamptz + ($3::interval), 'manual_qr')
          `,
          [payment.siteId, approvedPlanId, periodInterval, paidAt],
        );
      }
    }

    await audit(client, user, "billing.approve", "payment", paymentId, {
      siteId: payment.siteId,
    });
    return billingSummary(payment.siteId);
  });
}

async function rejectBillingPayment(paymentId, user, reason = "Telegram reject") {
  return transaction(async (client) => {
    const paymentResult = await client.query(
      `
        select
          p.id,
          p.site_id as "siteId",
          p.invoice_id as "invoiceId",
          p.amount::float,
          p.currency,
          p.status,
          p.meta,
          bi.status as "invoiceStatus"
        from payments p
        join billing_invoices bi on bi.id = p.invoice_id
        where p.id = $1
        limit 1
      `,
      [paymentId],
    );
    const payment = paymentResult.rows[0];
    if (!payment) {
      const error = new Error("Không tìm thấy giao dịch thanh toán.");
      error.code = "NOT_FOUND";
      error.statusCode = 404;
      throw error;
    }
    if (payment.status !== "awaiting_review") {
      const error = new Error("Chỉ từ chối giao dịch đang chờ duyệt.");
      error.code = "INVALID_STATE";
      error.statusCode = 409;
      throw error;
    }
    if (payment.invoiceStatus !== "pending") {
      const error = new Error("Chỉ từ chối hóa đơn đang chờ xác nhận.");
      error.code = "INVALID_STATE";
      error.statusCode = 409;
      throw error;
    }

    const updated = await client.query(
      `
        update payments
        set status = 'failed',
            meta = meta || jsonb_build_object(
              'rejectedAt', to_jsonb(now()),
              'rejectedBy', $2::text,
              'rejectReason', $3::text
            ),
            updated_at = now()
        where id = $1
        returning
          id,
          site_id as "siteId",
          invoice_id as "invoiceId",
          amount::float,
          currency,
          status,
          paid_at as "paidAt",
          meta,
          created_at as "createdAt"
      `,
      [paymentId, user.name || user.id, reason],
    );
    await client.query(
      `
        update billing_invoices
        set status = 'open',
            updated_at = now()
        where id = $1
          and status = 'pending'
      `,
      [payment.invoiceId],
    );
    await audit(client, user, "billing.reject", "payment", paymentId, {
      reason,
      siteId: payment.siteId,
    });
    return updated.rows[0];
  });
}

async function markBillingPaymentTelegramReviewMessage(paymentId, message) {
  if (!message?.message_id) return null;
  const updated = await queryOne(
    `
      update payments
      set meta = meta || jsonb_build_object(
            'telegramReviewMessageId', $2::text,
            'telegramReviewChatId', $3::text,
            'telegramReviewNotifiedAt', to_jsonb(now())
          ),
          updated_at = now()
      where id = $1
      returning id
    `,
    [paymentId, message.message_id, message.chat?.id || null],
  );
  return updated;
}

async function assertSiteCanWrite(siteId) {
  const resolvedSiteId = await resolveSiteId(siteId);
  const site = await queryOne(
    `
      select
        id,
        status,
        billing_status as "billingStatus",
        trial_ends_at as "trialEndsAt"
      from sites
      where id = $1
    `,
    [resolvedSiteId],
  );
  if (!site) {
    const error = new Error("Không tìm thấy site.");
    error.code = "SITE_NOT_FOUND";
    error.statusCode = 404;
    throw error;
  }
  if (site.status !== "active") {
    const error = new Error("Site hiện không hoạt động.");
    error.code = "SITE_INACTIVE";
    error.statusCode = 403;
    throw error;
  }

  if (
    billingWriteBlocked({
      billingStatus: site.billingStatus,
      trialEndsAt: site.trialEndsAt,
    })
  ) {
    const error = new Error(
      "Site đã khóa ghi dữ liệu. Thanh toán gói Plus để tiếp tục nhập và xuất hàng.",
    );
    error.code = "BILLING_REQUIRED";
    error.statusCode = 402;
    throw error;
  }

  return site;
}

async function listMaster(table, orderColumn, siteId) {
  const resolvedSiteId = await resolveSiteId(siteId);
  return query(
    `select id, ${orderColumn} as label, is_active as "isActive", created_at as "createdAt", updated_at as "updatedAt"
     from ${table}
     where site_id = $1 and is_active = true
     order by ${orderColumn}`,
    [resolvedSiteId],
  );
}

function receiptListFilters(filters = {}) {
  const clauses = [];
  const params = [];
  if (filters.customerId) {
    params.push(filters.customerId);
    clauses.push(`c.id = $${params.length + 1}`);
  }
  if (filters.dateFrom) {
    params.push(filters.dateFrom);
    clauses.push(`r.received_date >= $${params.length + 1}`);
  }
  if (filters.dateTo) {
    params.push(filters.dateTo);
    clauses.push(`r.received_date <= $${params.length + 1}`);
  }
  return {
    sql: clauses.length ? `and ${clauses.join(" and ")}` : "",
    params,
  };
}

function dispatchListFilters(filters = {}) {
  const clauses = [];
  const params = [];
  if (filters.customerId) {
    params.push(filters.customerId);
    clauses.push(`c.id = $${params.length + 1}`);
  }
  if (filters.dateFrom) {
    params.push(filters.dateFrom);
    clauses.push(`d.dispatch_date >= $${params.length + 1}`);
  }
  if (filters.dateTo) {
    params.push(filters.dateTo);
    clauses.push(`d.dispatch_date <= $${params.length + 1}`);
  }
  if (filters.date) {
    params.push(filters.date);
    clauses.push(`d.dispatch_date = $${params.length + 1}`);
  }
  if (filters.plate) {
    params.push(filters.plate);
    clauses.push(`v.plate = $${params.length + 1}`);
  }
  if (filters.driver) {
    params.push(filters.driver);
    clauses.push(`dr.name = $${params.length + 1}`);
  }
  if (filters.periodOpenAt) {
    params.push(filters.periodOpenAt);
    clauses.push(
      `d.created_at > coalesce($${params.length + 1}::timestamptz, '-infinity'::timestamptz)`,
    );
  }
  if (filters.periodClosedAt) {
    params.push(filters.periodClosedAt);
    clauses.push(`d.created_at <= $${params.length + 1}::timestamptz`);
  }
  return {
    sql: clauses.length ? `and ${clauses.join(" and ")}` : "",
    params,
  };
}

async function listReceiptsPaginated(
  siteId = null,
  filters = {},
  paginationInput = {},
) {
  const resolvedSiteId = await resolveSiteId(siteId);
  const { page, pageSize, limit, offset } = parseListPagination(paginationInput);
  const { sql: filterSql, params: filterParams } = receiptListFilters(filters);
  const baseParams = [resolvedSiteId, ...filterParams];
  const countRow = await queryOne(
    `
      select count(*)::int as total
      from (
        select r.id
        from receipts r
        join customers c on c.id = r.customer_id
        where r.site_id = $1
        ${filterSql}
        group by r.id
      ) counted
    `,
    baseParams,
  );
  const limitIndex = baseParams.length + 1;
  const offsetIndex = baseParams.length + 2;
  const items = await query(
    `
      select
        r.id,
        r.received_date as date,
        c.id as "customerId",
        c.name as customer,
        w.id as "warehouseId",
        w.code as "warehouseCode",
        coalesce((w.name || ' (' || w.code || ')'), '') as warehouse,
        r.received_by_name as "receivedByName",
        r.created_at as "createdAt",
        json_agg(json_build_object(
          'id', ri.id,
          'sku', ri.sku,
          'quantity', ri.quantity::float,
          'unit', ri.unit
        ) order by ri.sku) as items
      from receipts r
      join customers c on c.id = r.customer_id
      left join warehouses w on w.id = r.warehouse_id
      join receipt_items ri on ri.receipt_id = r.id
      where r.site_id = $1
      ${filterSql}
      group by r.id, c.id, c.name, w.id, w.code, w.name, r.received_by_name, r.created_at
      order by r.received_date desc, r.created_at desc
      limit $${limitIndex} offset $${offsetIndex}
    `,
    [...baseParams, limit, offset],
  );
  return toPaginatedList(items, countRow?.total, { page, pageSize });
}

async function listDispatchesPaginated(
  siteId = null,
  filters = {},
  paginationInput = {},
) {
  const resolvedSiteId = await resolveSiteId(siteId);
  const { page, pageSize, limit, offset } = parseListPagination(paginationInput);
  const { sql: filterSql, params: filterParams } = dispatchListFilters(filters);
  const baseParams = [resolvedSiteId, ...filterParams];
  const countRow = await queryOne(
    `
      select count(*)::int as total
      from (
        select d.id
        from dispatches d
        join customers c on c.id = d.customer_id
        join vehicles v on v.id = d.vehicle_id
        join drivers dr on dr.id = d.driver_id
        where d.site_id = $1
        ${filterSql}
        group by d.id
      ) counted
    `,
    baseParams,
  );
  const limitIndex = baseParams.length + 1;
  const offsetIndex = baseParams.length + 2;
  const items = await query(
    `
      select
        d.id,
        d.dispatch_date as date,
        c.id as "customerId",
        c.name as customer,
        v.plate,
        dr.name as driver,
        w.id as "warehouseId",
        w.code as "warehouseCode",
        coalesce((w.name || ' (' || w.code || ')'), d.warehouse_name) as warehouse,
        d.created_at as "createdAt",
        json_agg(json_build_object(
          'id', di.id,
          'sku', di.sku,
          'quantity', di.quantity::float,
          'unit', di.unit
        ) order by di.sku) as items
      from dispatches d
      join customers c on c.id = d.customer_id
      join vehicles v on v.id = d.vehicle_id
      join drivers dr on dr.id = d.driver_id
      left join warehouses w on w.id = d.warehouse_id
      join dispatch_items di on di.dispatch_id = d.id
      where d.site_id = $1
      ${filterSql}
      group by d.id, c.id, c.name, v.plate, dr.name, w.id, w.code, w.name, d.warehouse_name, d.created_at
      order by d.dispatch_date desc, d.created_at desc
      limit $${limitIndex} offset $${offsetIndex}
    `,
    [...baseParams, limit, offset],
  );
  return toPaginatedList(items, countRow?.total, { page, pageSize });
}

async function listUsers(siteId = null, paginationInput = {}) {
  const resolvedSiteId = await resolveSiteId(siteId);
  const { page, pageSize, limit, offset } = parseListPagination(paginationInput);
  const countRow = await queryOne(
    `
      select count(*)::int as total
      from site_memberships sm
      join users u on u.id = sm.user_id
      where sm.site_id = $1
        and sm.is_active = true
        and u.is_active = true
    `,
    [resolvedSiteId],
  );
  const items = await query(
    `
      select
        u.id,
        u.display_name as name,
        u.phone,
        sm.role,
        sm.is_active as "isActive",
        sm.created_at as "createdAt",
        sm.updated_at as "updatedAt"
      from site_memberships sm
      join users u on u.id = sm.user_id
      where sm.site_id = $1
        and sm.is_active = true
        and u.is_active = true
      order by sm.created_at desc
      limit $2 offset $3
    `,
    [resolvedSiteId, limit, offset],
  );
  return toPaginatedList(items, countRow?.total, { page, pageSize });
}

function masterDataSql() {
  return `
    select
      coalesce((
        select json_agg(row_to_json(item) order by item.label)
        from (
          select id, name as label, is_active as "isActive", created_at as "createdAt", updated_at as "updatedAt"
          from customers
          where site_id = $1 and is_active = true
          order by name
        ) item
      ), '[]'::json) as customers,
      coalesce((
        select json_agg(row_to_json(item) order by item.label)
        from (
          select id, name as label, is_active as "isActive", created_at as "createdAt", updated_at as "updatedAt"
          from drivers
          where site_id = $1 and is_active = true
          order by name
        ) item
      ), '[]'::json) as drivers,
      coalesce((
        select json_agg(row_to_json(item) order by item.label)
        from (
          select id, plate as label, is_active as "isActive", created_at as "createdAt", updated_at as "updatedAt"
          from vehicles
          where site_id = $1 and is_active = true
          order by plate
        ) item
      ), '[]'::json) as vehicles,
      coalesce((
        select json_agg(row_to_json(item) order by item.label)
        from (
          select
            id,
            name,
            code,
            (name || ' (' || code || ')') as label,
            is_active as "isActive",
            created_at as "createdAt",
            updated_at as "updatedAt"
          from warehouses
          where site_id = $1 and is_active = true
          order by name, code
        ) item
      ), '[]'::json) as warehouses
  `;
}

function mapMasterRow(row) {
  return {
    customers: row?.customers || [],
    drivers: row?.drivers || [],
    vehicles: row?.vehicles || [],
    warehouses: row?.warehouses || [],
  };
}

function formatWarehouseRow(row) {
  if (!row) return null;
  return {
    code: row.code,
    createdAt: row.createdAt || row.created_at,
    id: row.id,
    isActive: row.isActive ?? row.is_active ?? true,
    label: row.label || `${row.name} (${row.code})`,
    name: row.name,
    updatedAt: row.updatedAt || row.updated_at || row.createdAt || row.created_at,
  };
}

function warehouseCodeExistsError() {
  const error = new Error("Mã kho đã tồn tại trong site hiện tại.");
  error.statusCode = 409;
  error.code = "WAREHOUSE_CODE_EXISTS";
  return error;
}

function isWarehouseCodeUniqueViolation(error) {
  return (
    error?.code === "23505" &&
    ["warehouses_site_id_code_key", "warehouses_site_code_active_unique"].includes(
      error.constraint,
    )
  );
}

async function listWarehouses(siteId = null) {
  const resolvedSiteId = await resolveSiteId(siteId);
  const rows = await query(
    `
      select
        id,
        name,
        code,
        (name || ' (' || code || ')') as label,
        is_active as "isActive",
        created_at as "createdAt",
        updated_at as "updatedAt"
      from warehouses
      where site_id = $1 and is_active = true
      order by name, code
    `,
    [resolvedSiteId],
  );
  return rows.map(formatWarehouseRow);
}

async function createWarehouse({ name, code }, user) {
  return transaction(async (client) => {
    const siteId = await resolveSiteId(user.siteId);
    const existing = await client.query(
      "select id from warehouses where site_id = $1 and code = $2 and is_active = true limit 1",
      [siteId, code],
    );
    if (existing.rowCount) {
      throw warehouseCodeExistsError();
    }
    let result;
    try {
      result = await client.query(
        `
          insert into warehouses (site_id, name, code)
          values ($1, $2, $3)
          returning *
        `,
        [siteId, name, code],
      );
    } catch (error) {
      if (isWarehouseCodeUniqueViolation(error)) {
        throw warehouseCodeExistsError();
      }
      throw error;
    }
    await audit(client, { ...user, siteId }, "create", "warehouse", result.rows[0].id, {
      code,
      name,
      siteId,
    });
    return formatWarehouseRow(result.rows[0]);
  });
}

async function updateWarehouse(id, { name, code }, user) {
  return transaction(async (client) => {
    const siteId = await resolveSiteId(user.siteId);
    const existing = await client.query(
      "select id from warehouses where site_id = $1 and code = $2 and id <> $3 and is_active = true limit 1",
      [siteId, code, id],
    );
    if (existing.rowCount) {
      throw warehouseCodeExistsError();
    }
    let result;
    try {
      result = await client.query(
        `
          update warehouses
          set name = $1,
              code = $2,
              updated_at = now()
          where id = $3 and site_id = $4 and is_active = true
          returning *
        `,
        [name, code, id, siteId],
      );
    } catch (error) {
      if (isWarehouseCodeUniqueViolation(error)) {
        throw warehouseCodeExistsError();
      }
      throw error;
    }
    if (!result.rowCount) return null;
    await audit(client, { ...user, siteId }, "update", "warehouse", id, {
      code,
      name,
      siteId,
    });
    return formatWarehouseRow(result.rows[0]);
  });
}

async function softDeleteWarehouse(id, user) {
  return softDeleteMaster({
    entityType: "warehouse",
    id,
    table: "warehouses",
    user,
  });
}

async function masterData(siteId = null) {
  const resolvedSiteId = await resolveSiteId(siteId);
  const row = await queryOne(masterDataSql(), [resolvedSiteId]);
  return mapMasterRow(row);
}

function receiptDataSql(includeInventory = true) {
  return `
    select
      coalesce((
        select json_agg(json_build_object(
          'id', item.id,
          'date', item.date,
          'customerId', item."customerId",
          'customer', item.customer,
          'warehouseId', item."warehouseId",
          'warehouseCode', item."warehouseCode",
          'warehouse', item.warehouse,
          'receivedByName', item."receivedByName",
          'items', item.items
        ) order by item.date desc, item."createdAt" desc)
        from (
          select
            r.id,
            r.received_date as date,
            c.id as "customerId",
            c.name as customer,
            w.id as "warehouseId",
            w.code as "warehouseCode",
            coalesce((w.name || ' (' || w.code || ')'), '') as warehouse,
            r.received_by_name as "receivedByName",
            r.created_at as "createdAt",
            json_agg(json_build_object(
              'id', ri.id,
              'sku', ri.sku,
              'quantity', ri.quantity::float,
              'unit', ri.unit
            ) order by ri.sku) as items
          from receipts r
          join customers c on c.id = r.customer_id
          left join warehouses w on w.id = r.warehouse_id
          join receipt_items ri on ri.receipt_id = r.id
          where r.site_id = $1
          group by r.id, c.id, c.name, w.id, w.code, w.name
          order by r.received_date desc, r.created_at desc
          limit 500
        ) item
      ), '[]'::json) as receipts
      ${includeInventory ? `,
      ${inventoryJsonFromView()} as inventory` : ""}
  `;
}

function dispatchDataSql(includeInventory = true) {
  return `
    select
      coalesce((
        select json_agg(row_to_json(item) order by item.date desc, item."createdAt" desc)
        from (
          select
            d.id,
            d.dispatch_date as date,
            c.id as "customerId",
            c.name as customer,
            v.id as "vehicleId",
            v.plate,
            dr.id as "driverId",
            dr.name as driver,
            w.id as "warehouseId",
            w.code as "warehouseCode",
            coalesce((w.name || ' (' || w.code || ')'), d.warehouse_name) as warehouse,
            d.created_at as "createdAt",
            json_agg(json_build_object(
              'id', di.id,
              'sku', di.sku,
              'quantity', di.quantity::float,
              'unit', di.unit
            ) order by di.sku) as items
          from dispatches d
          join customers c on c.id = d.customer_id
          join vehicles v on v.id = d.vehicle_id
          join drivers dr on dr.id = d.driver_id
          left join warehouses w on w.id = d.warehouse_id
          join dispatch_items di on di.dispatch_id = d.id
          where d.site_id = $1
          group by d.id, c.id, c.name, v.id, v.plate, dr.id, dr.name, w.id, w.code, w.name, d.warehouse_name
          order by d.dispatch_date desc, d.created_at desc
          limit 500
        ) item
      ), '[]'::json) as dispatches
      ${includeInventory ? `,
      ${inventoryJsonFromView()} as inventory` : ""}
  `;
}

// Current-period inventory now lives in the v_customer_inventory_current view
// (see drizzle/migrations/014). These helpers select from it so the
// received - dispatched derivation has a single source of truth. $1 = site id.
function inventoryRowSql() {
  return `
    select
      customer_id as "customerId",
      customer,
      sku,
      unit,
      received_quantity::float as "receivedQuantity",
      dispatched_quantity::float as "dispatchedQuantity",
      remaining_quantity::float as "remainingQuantity",
      true as "currentPeriodOnly"
    from v_customer_inventory_current
    where site_id = $1
  `;
}

function inventoryJsonFromView() {
  return `coalesce((
    select json_agg(row_to_json(item) order by item.customer, item.sku)
    from (
      ${inventoryRowSql()}
    ) item
  ), '[]'::json)`;
}

async function fetchSiteInventory(siteId = null) {
  const resolvedSiteId = await resolveSiteId(siteId);
  const row = await queryOne(
    `select ${inventoryJsonFromView()} as inventory`,
    [resolvedSiteId],
  );
  return row?.inventory || [];
}

async function receiptData(siteId = null, options = {}) {
  const [master, inventory, receipts] = await Promise.all([
    masterData(siteId),
    fetchSiteInventory(siteId),
    listReceiptsPaginated(
      siteId,
      options.receiptFilters || {},
      options.receipts || {},
    ),
  ]);
  return {
    ...master,
    inventory,
    inventoryCurrentPeriodOnly: true,
    receipts,
  };
}

async function dispatchData(siteId = null, options = {}) {
  const [master, inventory, dispatches] = await Promise.all([
    masterData(siteId),
    fetchSiteInventory(siteId),
    listDispatchesPaginated(
      siteId,
      options.dispatchFilters || {},
      options.dispatches || {},
    ),
  ]);
  return {
    ...master,
    dispatches,
    inventory,
    inventoryCurrentPeriodOnly: true,
  };
}

async function accountingClosures(siteId = null, paginationInput = {}) {
  const resolvedSiteId = await resolveSiteId(siteId);
  const { page, pageSize, limit, offset } = parseListPagination(paginationInput);
  const countRow = await queryOne(
    `
      select count(*)::int as total
      from invoice_approvals ia
      where ia.site_id = $1
    `,
    [resolvedSiteId],
  );
  const items = await query(
    `
      select
        ia.id,
        ia.approval_date as date,
        ia.period_start as "periodStart",
        ia.period_end as "periodEnd",
        ia.period_closed_at as "periodClosedAt",
        ia.status,
        c.id as "customerId",
        c.name as customer,
        ia.approved_by_name as "approvedByName",
        ia.created_at as "createdAt"
      from invoice_approvals ia
      join customers c on c.id = ia.customer_id
      where ia.site_id = $1
      order by ia.approval_date desc, ia.created_at desc
      limit $2 offset $3
    `,
    [resolvedSiteId, limit, offset],
  );
  return toPaginatedList(items, countRow?.total, { page, pageSize });
}

async function accountingReady(siteId = null) {
  return billingReadyCustomers(siteId);
}

async function accountingData(siteId = null, options = {}) {
  const [ready, closures] = await Promise.all([
    accountingReady(siteId),
    accountingClosures(siteId, options.closures || {}),
  ]);
  return {
    billingReady: ready,
    closures: closures.items,
    closuresPage: closures,
    invoiceApprovals: closures.items,
    ready,
  };
}

async function siteBillingStatus(siteId = null) {
  const resolvedSiteId = await resolveSiteId(siteId);
  return queryOne(
    `
      select
        s.id as "siteId",
        s.code as "siteCode",
        s.public_slug as "siteSlug",
        s.name as "siteName",
        s.billing_status as "billingStatus",
        s.trial_started_at as "trialStartedAt",
        s.trial_ends_at as "trialEndsAt",
        coalesce((
          select row_to_json(item)
          from (
            select
              bi.id,
              bi.amount::float,
              bi.currency,
              bi.status,
              bi.due_date as "dueDate",
              bi.paid_at as "paidAt",
              bi.created_at as "createdAt"
            from billing_invoices bi
            where bi.site_id = s.id and bi.status in ('open', 'pending')
            order by bi.created_at desc
            limit 1
          ) item
        ), null) as "openInvoice",
        coalesce((
          select row_to_json(item)
          from (
            select
              p.id,
              p.invoice_id as "invoiceId",
              p.amount::float,
              p.currency,
              p.status,
              p.paid_at as "paidAt",
              p.meta,
              p.created_at as "createdAt"
            from payments p
            join billing_invoices bi on bi.id = p.invoice_id
            where p.site_id = s.id
              and bi.status in ('open', 'pending')
              and p.status in ('pending', 'awaiting_review')
            order by p.created_at desc
            limit 1
          ) item
        ), null) as "pendingPayment"
      from sites s
      where s.id = $1
    `,
    [resolvedSiteId],
  );
}

async function dashboardSummary(siteId = null) {
  const resolvedSiteId = await resolveSiteId(siteId);
  const [row, billingReady] = await Promise.all([
    queryOne(
    `
      select
        ${inventoryJsonFromView()} as inventory,
        coalesce((
          select json_agg(row_to_json(item) order by item.date)
          from (
            select r.received_date::text as date, sum(ri.quantity)::float as quantity
            from receipts r
            join receipt_items ri on ri.receipt_id = r.id
            where r.site_id = $1
              and r.received_date >= current_date - interval '120 days'
            group by r.received_date
          ) item
        ), '[]'::json) as "receiptDaily",
        coalesce((
          select json_agg(row_to_json(item) order by item.date)
          from (
            select d.dispatch_date::text as date, sum(di.quantity)::float as quantity
            from dispatches d
            join dispatch_items di on di.dispatch_id = d.id
            where d.site_id = $1
              and d.dispatch_date >= current_date - interval '120 days'
            group by d.dispatch_date
          ) item
        ), '[]'::json) as "dispatchDaily",
        coalesce((
          select json_agg(row_to_json(item) order by item.date)
          from (
            select d.dispatch_date::text as date, count(distinct d.id)::int as count
            from dispatches d
            where d.site_id = $1
              and d.dispatch_date >= current_date - interval '120 days'
            group by d.dispatch_date
          ) item
        ), '[]'::json) as "dispatchCounts",
        coalesce((
          select json_agg(row_to_json(item) order by item.date)
          from (
            select ia.approval_date::text as date, count(*)::int as count
            from invoice_approvals ia
            where ia.site_id = $1
              and ia.approval_date >= current_date - interval '120 days'
            group by ia.approval_date
          ) item
        ), '[]'::json) as "closureCounts",
        coalesce((
          select json_agg(row_to_json(item))
          from (
            select
              c.name as customer,
              max(greatest(r.received_date, d.dispatch_date))::text as "latestDate"
            from customers c
            left join receipts r
              on r.customer_id = c.id and r.site_id = $1
            left join dispatches d
              on d.customer_id = c.id and d.site_id = $1
            where c.site_id = $1 and c.is_active = true
            group by c.name
          ) item
        ), '[]'::json) as "customerActivity",
        json_build_object(
          'customers', (select count(*)::int from customers where site_id = $1 and is_active = true),
          'vehicles', (select count(*)::int from vehicles where site_id = $1 and is_active = true),
          'drivers', (
            select count(*)::int
            from site_memberships sm
            join users u on u.id = sm.user_id
            where sm.site_id = $1
              and sm.role = 'driver'
              and sm.is_active = true
              and u.is_active = true
          )
        ) as "catalogCounts"
    `,
      [resolvedSiteId],
    ),
    billingReadyCustomers(resolvedSiteId),
  ]);

  return {
    billingReady,
    billingReadyCount: billingReady.length,
    catalogCounts: row?.catalogCounts || {
      customers: 0,
      drivers: 0,
      vehicles: 0,
    },
    closureCounts: row?.closureCounts || [],
    customerActivity: row?.customerActivity || [],
    dispatchCounts: row?.dispatchCounts || [],
    dispatchDaily: row?.dispatchDaily || [],
    inventory: row?.inventory || [],
    receiptDaily: row?.receiptDaily || [],
  };
}

async function appContextData(siteId = null, page = "shell") {
  const resolvedSiteId = await resolveSiteId(siteId);
  const billingStatus = await siteBillingStatus(resolvedSiteId);

  if (page === "accounting") {
    const [catalog, accounting] = await Promise.all([
      masterData(resolvedSiteId),
      accountingData(resolvedSiteId),
    ]);
    return { accounting, billingStatus, catalog };
  }

  if (page === "dashboard") {
    return {
      billingStatus,
      dashboard: await dashboardSummary(resolvedSiteId),
    };
  }

  return { billingStatus };
}

async function createNamedMaster({ table, column, value, user, entityType }) {
  return transaction(async (client) => {
    const siteId = await resolveSiteId(user.siteId);
    const result = await client.query(
      `
        insert into ${table} (site_id, ${column})
        values ($1, $2)
        on conflict (site_id, ${column}) do update
        set is_active = true, updated_at = now()
        returning *
      `,
      [siteId, value],
    );
    await audit(client, { ...user, siteId }, "create", entityType, result.rows[0].id, {
      [column]: value,
      siteId,
    });
    return result.rows[0];
  });
}

async function updateNamedMaster({ table, column, id, value, user, entityType }) {
  return transaction(async (client) => {
    const siteId = await resolveSiteId(user.siteId);
    const result = await client.query(
      `
        update ${table}
        set ${column} = $1, updated_at = now()
        where id = $2 and site_id = $3 and is_active = true
        returning *
      `,
      [value, id, siteId],
    );
    if (!result.rowCount) return null;
    await audit(client, { ...user, siteId }, "update", entityType, id, {
      [column]: value,
      siteId,
    });
    return result.rows[0];
  });
}

async function assertCustomerCanBeDeleted(client, customerId, siteId) {
  const result = await client.query(
    `
      with receipts_by_sku as (
        select ri.sku, sum(ri.quantity) as received_quantity
        from receipts r
        join receipt_items ri on ri.receipt_id = r.id
        where r.customer_id = $1
          and r.site_id = $2
        group by ri.sku
      ),
      dispatches_by_sku as (
        select di.sku, sum(di.quantity) as dispatched_quantity
        from dispatches d
        join dispatch_items di on di.dispatch_id = d.id
        where d.customer_id = $1
          and d.site_id = $2
        group by di.sku
      ),
      inventory as (
        select
          coalesce(sum(r.received_quantity - coalesce(d.dispatched_quantity, 0)), 0) as remaining_quantity,
          count(*) as item_count
        from receipts_by_sku r
        left join dispatches_by_sku d on d.sku = r.sku
      )
      select
        i.remaining_quantity::float as "remainingQuantity",
        i.item_count::int as "itemCount",
        exists (
          select 1
          from invoice_approvals ia
          where ia.customer_id = $1
            and ia.site_id = $2
        ) as "hasInvoiceApproval"
      from inventory i
    `,
    [customerId, siteId],
  );

  const usage = result.rows[0] || {
    remainingQuantity: 0,
    itemCount: 0,
    hasInvoiceApproval: false,
  };

  if (Number(usage.remainingQuantity) > 0) {
    const error = new Error("Không thể xóa khách hàng này vì vẫn còn hàng trong kho.");
    error.statusCode = 409;
    error.code = "CUSTOMER_DELETE_BLOCKED";
    throw error;
  }

  if (Number(usage.itemCount) > 0 && !usage.hasInvoiceApproval) {
    const error = new Error("Không thể xóa khách hàng này vì còn báo cáo cần xuất hóa đơn.");
    error.statusCode = 409;
    error.code = "CUSTOMER_DELETE_BLOCKED";
    throw error;
  }
}

async function softDeleteMaster({ table, id, user, entityType }) {
  return transaction(async (client) => {
    const siteId = await resolveSiteId(user.siteId);
    if (table === "customers") {
      const customer = await client.query(
        "select id from customers where id = $1 and site_id = $2 and is_active = true",
        [id, siteId],
      );
      if (!customer.rowCount) return null;
      await assertCustomerCanBeDeleted(client, id, siteId);
    }

    const result = await client.query(
      `
        update ${table}
        set is_active = false, updated_at = now()
        where id = $1 and site_id = $2 and is_active = true
        returning *
      `,
      [id, siteId],
    );
    if (!result.rowCount) return null;
    await audit(client, { ...user, siteId }, "delete", entityType, id);
    return result.rows[0];
  });
}

async function scopedId(client, { table, id, siteId, label = "Bản ghi" }) {
  if (!id) return null;
  const result = await client.query(
    `select id from ${table} where id = $1 and site_id = $2 and is_active = true`,
    [id, siteId],
  );
  if (!result.rowCount) {
    const error = new Error(`${label} không thuộc site hiện tại hoặc đã bị khóa.`);
    error.statusCode = 404;
    error.code = "SCOPED_RECORD_NOT_FOUND";
    throw error;
  }
  return id;
}

async function ensureCustomer(client, { customerId, customerName, siteId }) {
  if (customerId) {
    return scopedId(client, {
      id: customerId,
      label: "Khách hàng",
      siteId,
      table: "customers",
    });
  }
  const result = await client.query(
    `
      insert into customers (site_id, name)
      values ($1, $2)
      on conflict (site_id, name) do update
      set is_active = true, updated_at = now()
      returning id
    `,
    [siteId, customerName],
  );
  return result.rows[0].id;
}

async function ensureVehicle(client, { vehicleId, plate, siteId }) {
  if (vehicleId) {
    return scopedId(client, {
      id: vehicleId,
      label: "Xe",
      siteId,
      table: "vehicles",
    });
  }
  const result = await client.query(
    `
      insert into vehicles (site_id, plate)
      values ($1, $2)
      on conflict (site_id, plate) do update
      set is_active = true, updated_at = now()
      returning id
    `,
    [siteId, plate],
  );
  return result.rows[0].id;
}

async function ensureDriver(client, { driverId, driverName, siteId }) {
  if (driverId) {
    return scopedId(client, {
      id: driverId,
      label: "Tài xế",
      siteId,
      table: "drivers",
    });
  }
  const result = await client.query(
    `
      insert into drivers (site_id, name)
      values ($1, $2)
      on conflict (site_id, name) do update
      set is_active = true, updated_at = now()
      returning id
    `,
    [siteId, driverName],
  );
  return result.rows[0].id;
}

async function resolveWarehouse(client, { warehouseCode, warehouseId, siteId }) {
  if (warehouseId) {
    const id = await scopedId(client, {
      id: warehouseId,
      label: "Kho",
      siteId,
      table: "warehouses",
    });
    const row = await client.query(
      `
        select id, name, code, (name || ' (' || code || ')') as label
        from warehouses
        where id = $1 and site_id = $2 and is_active = true
        limit 1
      `,
      [id, siteId],
    );
    return row.rows[0];
  }

  const code = warehouseCode?.toString().trim().toUpperCase();
  const result = await client.query(
    `
      select id, name, code, (name || ' (' || code || ')') as label
      from warehouses
      where site_id = $1
        and is_active = true
        and ($2::text is null or code = $2)
      order by name, code
      limit 1
    `,
    [siteId, code || null],
  );

  if (!result.rowCount) {
    const error = new Error(
      code ? "Mã kho không thuộc site hiện tại hoặc đã bị khóa." : "Site chưa có kho hoạt động.",
    );
    error.statusCode = code ? 404 : 409;
    error.code = code ? "WAREHOUSE_NOT_FOUND" : "WAREHOUSE_REQUIRED";
    throw error;
  }

  return result.rows[0];
}

async function availableInventory(client, customerId, skus = [], siteId) {
  const result = await client.query(
    `
      with receipts_by_sku as (
        select ri.sku, coalesce(max(ri.unit), 'đơn vị') as unit, sum(ri.quantity) as received_quantity
        from receipts r
        join receipt_items ri on ri.receipt_id = r.id
        where r.customer_id = $1
          and r.site_id = $3
          and (coalesce(array_length($2::text[], 1), 0) = 0 or ri.sku = any($2::text[]))
        group by ri.sku
      ),
      dispatches_by_sku as (
        select di.sku, sum(di.quantity) as dispatched_quantity
        from dispatches d
        join dispatch_items di on di.dispatch_id = d.id
        where d.customer_id = $1
          and d.site_id = $3
          and (coalesce(array_length($2::text[], 1), 0) = 0 or di.sku = any($2::text[]))
        group by di.sku
      )
      select
        r.sku,
        r.unit,
        r.received_quantity::float as "receivedQuantity",
        coalesce(d.dispatched_quantity, 0)::float as "dispatchedQuantity",
        (r.received_quantity - coalesce(d.dispatched_quantity, 0))::float as "remainingQuantity"
      from receipts_by_sku r
      left join dispatches_by_sku d on d.sku = r.sku
      order by r.sku
    `,
    [customerId, skus, siteId],
  );
  return result.rows;
}

async function createReceipt(data, user) {
  return transaction(async (client) => {
    const siteId = await resolveSiteId(user.siteId);
    const customerId = await ensureCustomer(client, { ...data, siteId });
    const warehouse = await resolveWarehouse(client, { ...data, siteId });
    const customerName =
      data.customerName ||
      (await client.query("select name from customers where id = $1 and site_id = $2", [customerId, siteId])).rows[0]?.name ||
      "";
    const receipt = await client.query(
      `
        insert into receipts (site_id, customer_id, warehouse_id, received_by_id, received_by_name, received_date)
        values ($1, $2, $3, $4, $5, $6)
        returning id, received_date, received_by_name, created_at
      `,
      [siteId, customerId, warehouse.id, user.id, data.receivedByName || user.name, data.date],
    );

    const items = await client.query(
      `
        insert into receipt_items (receipt_id, sku, quantity, unit)
        select $1, item.sku, item.quantity, item.unit
        from jsonb_to_recordset($2::jsonb) as item(sku text, quantity numeric, unit text)
        returning id, sku, quantity::float as quantity, unit
      `,
      [receipt.rows[0].id, JSON.stringify(data.items)],
    );

    await audit(client, { ...user, siteId }, "create", "receipt", receipt.rows[0].id, {
      customerId,
      itemCount: data.items.length,
      siteId,
    });
    return {
      id: receipt.rows[0].id,
      createdAt: receipt.rows[0].created_at,
      customer: customerName,
      customerId,
      date: receipt.rows[0].received_date,
      items: items.rows,
      receivedByName: receipt.rows[0].received_by_name,
      warehouse: warehouse.label,
      warehouseCode: warehouse.code,
      warehouseId: warehouse.id,
    };
  });
}

async function createDispatch(data, user) {
  return transaction(async (client) => {
    const siteId = await resolveSiteId(user.siteId);
    const customerId = await ensureCustomer(client, { ...data, siteId });
    const vehicleId = await ensureVehicle(client, { ...data, siteId });
    const driverId = await ensureDriver(client, { ...data, siteId });
    const warehouse = await resolveWarehouse(client, { ...data, siteId });
    const customerName =
      data.customerName ||
      (await client.query("select name from customers where id = $1 and site_id = $2", [customerId, siteId])).rows[0]?.name ||
      "";
    const plate =
      data.plate ||
      (await client.query("select plate from vehicles where id = $1 and site_id = $2", [vehicleId, siteId])).rows[0]?.plate ||
      "";
    const driverName =
      data.driverName ||
      (await client.query("select name from drivers where id = $1 and site_id = $2", [driverId, siteId])).rows[0]?.name ||
      "";
    await client.query("select pg_advisory_xact_lock(hashtext($1))", [`dispatch:${siteId}:${customerId}`]);
    const requestedSkus = Array.from(new Set(data.items.map((item) => item.sku)));
    const inventory = await availableInventory(client, customerId, requestedSkus, siteId);
    const remainingBySku = new Map(
      inventory.map((row) => [row.sku, Number(row.remainingQuantity)]),
    );

    for (const item of data.items) {
      const remaining = remainingBySku.get(item.sku) || 0;
      if (Number(item.quantity) > remaining) {
        const error = new Error(`Số lượng ${item.sku} vượt tồn khả dụng.`);
        error.statusCode = 409;
        error.code = "INSUFFICIENT_INVENTORY";
        throw error;
      }
      remainingBySku.set(item.sku, remaining - Number(item.quantity));
    }

    const dispatch = await client.query(
      `
        insert into dispatches (
          site_id, customer_id, vehicle_id, driver_id, warehouse_id, warehouse_user_id, warehouse_name, dispatch_date
        )
        values ($1, $2, $3, $4, $5, $6, $7, $8)
        returning id, dispatch_date, warehouse_name, created_at
      `,
      [
        siteId,
        customerId,
        vehicleId,
        driverId,
        warehouse.id,
        user.id,
        data.warehouseName || warehouse.name,
        data.date,
      ],
    );

    const items = await client.query(
      `
        insert into dispatch_items (dispatch_id, sku, quantity, unit)
        select $1, item.sku, item.quantity, item.unit
        from jsonb_to_recordset($2::jsonb) as item(sku text, quantity numeric, unit text)
        returning id, sku, quantity::float as quantity, unit
      `,
      [dispatch.rows[0].id, JSON.stringify(data.items)],
    );

    await audit(client, { ...user, siteId }, "create", "dispatch", dispatch.rows[0].id, {
      customerId,
      vehicleId,
      driverId,
      itemCount: data.items.length,
      siteId,
    });
    return {
      id: dispatch.rows[0].id,
      createdAt: dispatch.rows[0].created_at,
      customer: customerName,
      customerId,
      date: dispatch.rows[0].dispatch_date,
      driver: driverName,
      driverId,
      items: items.rows,
      plate,
      vehicleId,
      warehouse: warehouse.label,
      warehouseCode: warehouse.code,
      warehouseId: warehouse.id,
    };
  });
}

async function inventoryRows(customerId = null, siteId = null) {
  const resolvedSiteId = await resolveSiteId(siteId);
  return query(
    `
      ${inventoryRowSql()}
        and ($2::uuid is null or customer_id = $2)
      order by customer, sku
    `,
    [resolvedSiteId, customerId],
  );
}

async function billingReadyCustomers(siteId = null) {
  const resolvedSiteId = await resolveSiteId(siteId);
  return query(`
    with last_invoice as (
      select customer_id, max(period_closed_at) as period_closed_at
      from invoice_approvals
      where site_id = $1
      group by customer_id
    ),
    receipts_by_customer_sku as (
      select
        c.id as customer_id,
        c.name as customer,
        ri.sku,
        sum(ri.quantity) as received_quantity,
        min(r.received_date) as first_receipt_date,
        max(r.received_date) as last_receipt_date,
        max(r.created_at) as last_receipt_at
      from customers c
      left join last_invoice li on li.customer_id = c.id
      join receipts r on r.customer_id = c.id
      join receipt_items ri on ri.receipt_id = r.id
      where c.site_id = $1
        and (li.period_closed_at is null or r.created_at > li.period_closed_at)
      group by c.id, c.name, ri.sku
    ),
    dispatches_by_customer_sku as (
      select
        d.customer_id,
        di.sku,
        sum(di.quantity) as dispatched_quantity,
        max(d.dispatch_date) as last_dispatch_date,
        max(d.created_at) as last_dispatch_at
      from dispatches d
      left join last_invoice li on li.customer_id = d.customer_id
      join dispatch_items di on di.dispatch_id = d.id
      where d.site_id = $1
        and (li.period_closed_at is null or d.created_at > li.period_closed_at)
      group by d.customer_id, di.sku
    ),
    inventory as (
      select
        r.customer_id,
        r.customer,
        sum(r.received_quantity - coalesce(d.dispatched_quantity, 0)) as remaining_quantity,
        count(*) as item_count,
        min(r.first_receipt_date) as period_start,
        max(greatest(r.last_receipt_date, coalesce(d.last_dispatch_date, r.last_receipt_date))) as period_end,
        max(greatest(r.last_receipt_at, coalesce(d.last_dispatch_at, r.last_receipt_at))) as period_closed_at
      from receipts_by_customer_sku r
      left join dispatches_by_customer_sku d
        on d.customer_id = r.customer_id and d.sku = r.sku
      group by r.customer_id, r.customer
    )
    select
      i.customer_id as "customerId",
      i.customer,
      i.item_count::int as "itemCount",
      i.period_start as "periodStart",
      i.period_end as "periodEnd",
      (select li.period_closed_at from last_invoice li where li.customer_id = i.customer_id) as "periodOpenAt",
      i.period_closed_at as "periodClosedAt",
      (
        select count(*)::int
        from dispatches d
        left join last_invoice li2 on li2.customer_id = d.customer_id
        where d.customer_id = i.customer_id
          and d.site_id = $1
          and (
            li2.period_closed_at is null
            or d.created_at > li2.period_closed_at
          )
      ) as "historyCount"
    from inventory i
    left join invoice_approvals ia
      on ia.customer_id = i.customer_id
      and ia.period_closed_at = i.period_closed_at
    where i.remaining_quantity = 0 and ia.id is null
    order by i.customer
  `, [resolvedSiteId]);
}

async function createInvoiceApproval(data, user) {
  return transaction(async (client) => {
    const siteId = await resolveSiteId(user.siteId);
    await scopedId(client, {
      id: data.customerId,
      label: "Khách hàng",
      siteId,
      table: "customers",
    });
    const approvalDate = data.approvalDate || new Date().toISOString().slice(0, 10);
    const periodStart = data.periodStart || approvalDate;
    const periodEnd = data.periodEnd || approvalDate;
    const periodClosedAt = data.periodClosedAt || new Date().toISOString();
    const approval = await client.query(
      `
        insert into invoice_approvals (
          site_id,
          customer_id,
          approved_by_id,
          approved_by_name,
          approval_date,
          period_start,
          period_end,
          period_closed_at,
          status
        )
        values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        on conflict (site_id, customer_id, period_closed_at) do update
        set approved_by_id = excluded.approved_by_id,
            approved_by_name = excluded.approved_by_name,
            approval_date = excluded.approval_date,
            period_start = excluded.period_start,
            period_end = excluded.period_end,
            status = excluded.status,
            updated_at = now()
        returning *
      `,
      [
        siteId,
        data.customerId,
        user.id,
        data.approvedByName || user.name,
        approvalDate,
        periodStart,
        periodEnd,
        periodClosedAt,
        data.status,
      ],
    );
    await audit(client, { ...user, siteId }, "create", "invoice_approval", approval.rows[0].id, {
      customerId: data.customerId,
      periodClosedAt,
      periodEnd,
      periodStart,
      siteId,
    });
    const row = approval.rows[0];
    const customer = await client.query(
      "select name from customers where id = $1 and site_id = $2",
      [data.customerId, siteId],
    );
    return {
      id: row.id,
      customerId: row.customer_id,
      customer: customer.rows[0]?.name || "",
      date: row.approval_date,
      approvedByName: row.approved_by_name,
      periodStart: row.period_start,
      periodEnd: row.period_end,
      periodClosedAt: row.period_closed_at,
      status: row.status,
      createdAt: row.created_at,
    };
  });
}

async function deactivateSiteUser(userId, siteId) {
  const resolvedSiteId = await resolveSiteId(siteId);
  return transaction(async (client) => {
    const targetUser = await client.query(
      `
        select is_platform_admin as "isPlatformAdmin"
        from users
        where id = $1
        limit 1
      `,
      [userId],
    );
    const isPlatformAdmin = Boolean(targetUser.rows[0]?.isPlatformAdmin);

    const membership = await client.query(
      `
        update site_memberships
        set is_active = false, updated_at = now()
        where site_id = $1 and user_id = $2 and is_active = true
        returning id, role
      `,
      [resolvedSiteId, userId],
    );
    if (!membership.rowCount) return null;

    const wasDriver = membership.rows[0].role === "driver";

    const activeMemberships = await client.query(
      "select 1 from site_memberships where user_id = $1 and is_active = true limit 1",
      [userId],
    );
    if (!activeMemberships.rowCount && !isPlatformAdmin) {
      await client.query(
        "update users set is_active = false, updated_at = now() where id = $1",
        [userId],
      );
    }

    if (wasDriver) {
      const userRow = await client.query(
        "select display_name from users where id = $1",
        [userId],
      );
      const driverName = userRow.rows[0]?.display_name;
      if (driverName) {
        await client.query(
          `
            update drivers
            set is_active = false, updated_at = now()
            where site_id = $1 and name = $2 and is_active = true
          `,
          [resolvedSiteId, driverName],
        );
      }
    }

    return membership.rows[0];
  });
}

export default {
  accountingClosures,
  accountingData,
  accountingReady,
  assertPlatformAdmin,
  fetchSiteInventory,
  assertSiteCanWrite,
  approveBillingPayment,
  billingReadyCustomers,
  billingSummary,
  appContextData,
  dashboardSummary,
  confirmBillingPayment,
  createBillingCheckout,
  createDispatch,
  createInvoiceApproval,
  createNamedMaster,
  createPlatformSite,
  createReceipt,
  deactivateSiteUser,
  defaultSite,
  dispatchData,
  inventoryRows,
  listDispatchesPaginated,
  listMaster,
  listPlans,
  listPlatformSites,
  platformBillingDashboard,
  listReceiptsPaginated,
  listSites,
  listUsers,
  masterData,
  query,
  queryOne,
  receiptData,
  rejectBillingPayment,
  resolveSiteId,
  siteByPublicSlug,
  siteBillingStatus,
  markBillingPaymentTelegramReviewMessage,
  createWarehouse,
  listWarehouses,
  softDeleteMaster,
  softDeleteWarehouse,
  updateNamedMaster,
  updatePlatformSite,
  updateWarehouse,
};
