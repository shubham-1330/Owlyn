"use client";

import { useState } from "react";

import { Modal } from "@/components/ui/modal";
import type { SizeChartData } from "@/lib/queries/product";

export function SizeGuideDialog({ chart }: { chart: SizeChartData }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-sm underline underline-offset-4 hover:text-primary"
      >
        Size guide
      </button>
      <Modal open={open} onOpenChange={setOpen} title={chart.name} description={chart.note}>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm num">
            <thead className="text-left">
              <tr>
                {chart.columns.map((column) => (
                  <th key={column} className="border-b border-border py-2 pr-4 font-medium">
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {chart.rows.map((row, i) => (
                <tr key={i}>
                  {row.map((cell, j) => (
                    <td key={j} className="border-b border-border py-2 pr-4 text-foreground/90">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Modal>
    </>
  );
}
