"use client";

import { ChevronRight } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { BillingSection } from "./billing-section";
import { masterSections } from "./master-sections";
import { MasterSection } from "./master-section";
import { UserSection } from "./user-section";

export function ManagementPage({
  activeRole,
  billing,
  mutation,
  state,
  userMutation,
  users,
}) {
  const [activeList, setActiveList] = useState("");
  const recordsByList = {
    customers: state.customerRecords,
    vehicles: state.vehicleRecords,
  };

  return (
    <div className="grid gap-3">
      {activeRole === "admin" ? (
        <UserSection
          isActive={activeList === "users"}
          mutation={userMutation}
          onToggle={() => setActiveList(activeList === "users" ? "" : "users")}
          users={users}
        />
      ) : null}
      {masterSections.map((section) => {
        const isActive = section.listName === activeList;
        return (
          <Card className="overflow-hidden" key={section.listName}>
            <button
              aria-expanded={isActive}
              className={cn(
                "flex min-h-16 w-full items-center justify-between gap-3 px-4 text-left transition hover:bg-slate-50 sm:px-5",
                isActive && "border-b border-slate-100 bg-slate-50",
              )}
              onClick={() => setActiveList(isActive ? "" : section.listName)}
              type="button"
            >
              <strong className="text-base font-bold leading-tight text-slate-950">
                {section.label}
              </strong>
              <ChevronRight
                className={cn(
                  "h-6 w-6 shrink-0 text-slate-500 transition",
                  isActive && "rotate-90 text-emerald-700",
                )}
              />
            </button>
            {isActive ? (
              <MasterSection
                config={section}
                mutation={mutation}
                records={recordsByList[section.listName] || []}
              />
            ) : null}
          </Card>
        );
      })}
      <BillingSection
        billing={billing}
        isActive={activeList === "billing"}
        onToggle={() =>
          setActiveList(activeList === "billing" ? "" : "billing")
        }
      />
    </div>
  );
}
