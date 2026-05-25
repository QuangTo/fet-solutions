"use client";

import {
  configurableRoleOrder,
  pages,
  roles,
} from "@/lib/fet-domain";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, Select } from "@/components/ui/form";
import { Table, Td, Th } from "@/components/ui/table";
import {
  operationActionButtonClass,
  operationActionButtonShellClass,
  pageOrder,
} from "../lib/constants";

export function SettingsPage({
  isPageAccessPending,
  isUiPending,
  onApplyPageAccess,
  onApplyUi,
  pageAccessDraft,
  setPageAccessDraft,
  setSettingsDraft,
  settingsDraft,
}) {
  const togglePageAccess = (pageId, role, checked) => {
    if (role === "admin") return;
    setPageAccessDraft((current) => {
      const allowed = [...(current[pageId] || [])];
      const nextAllowed = checked
        ? [...new Set([...allowed, role])]
        : allowed.filter((item) => item !== role);
      return {
        ...current,
        [pageId]: [...new Set(["admin", ...nextAllowed])],
      };
    });
  };

  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Tùy chỉnh giao diện</CardTitle>
          <CardDescription>Tùy chọn cỡ chữ và màu sắc.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <Field>
            Cỡ chữ
            <Select
              value={settingsDraft.density}
              onChange={(event) =>
                setSettingsDraft({
                  ...settingsDraft,
                  density: event.target.value,
                })
              }
            >
              <option value="comfortable">Vừa (web)</option>
              <option value="compact">Gọn (mobile)</option>
            </Select>
          </Field>
          <Field>
            Tông màu
            <Select
              value={settingsDraft.accent}
              onChange={(event) =>
                setSettingsDraft({
                  ...settingsDraft,
                  accent: event.target.value,
                })
              }
            >
              <option value="emerald">Xanh ngọc</option>
              <option value="slate">Trung tính</option>
            </Select>
          </Field>
        </CardContent>
        <div className="border-t border-slate-200 px-6 pb-6 pt-4">
          <div className={operationActionButtonShellClass}>
            <Button
              className={operationActionButtonClass}
              disabled={isUiPending}
              onClick={onApplyUi}
              type="button"
            >
              Áp dụng
            </Button>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Quyền quản trị</CardTitle>
          <CardDescription>Tùy chỉnh quyền truy cập</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <thead>
              <tr>
                <Th className="min-w-28">Vai trò</Th>
                {pageOrder.map((pageId) => (
                  <Th className="min-w-24 text-center" key={pageId}>
                    {pages[pageId].title}
                  </Th>
                ))}
              </tr>
            </thead>
            <tbody>
              {configurableRoleOrder.map((role) => (
                <tr key={role}>
                  <Td className="font-bold text-slate-950">{roles[role]}</Td>
                  {pageOrder.map((pageId) => {
                    const checked = (pageAccessDraft[pageId] || []).includes(
                      role,
                    );
                    const isAdminRole = role === "admin";
                    return (
                      <Td className="text-center" key={`${role}-${pageId}`}>
                        <label className="inline-flex items-center justify-center">
                          <input
                            checked={checked}
                            className="h-4 w-4 accent-emerald-600 disabled:opacity-60"
                            disabled={isAdminRole}
                            type="checkbox"
                            onChange={(event) =>
                              togglePageAccess(
                                pageId,
                                role,
                                event.target.checked,
                              )
                            }
                          />
                        </label>
                      </Td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </Table>
        </CardContent>
        <div className="border-t border-slate-200 px-6 pb-6 pt-4">
          <div className={operationActionButtonShellClass}>
            <Button
              className={operationActionButtonClass}
              disabled={isPageAccessPending}
              onClick={onApplyPageAccess}
              type="button"
            >
              Áp dụng
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
