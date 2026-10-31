import { listRecentAudit } from "@javis-market/api";
import { Card, PageHeader } from "@/components/admin/page-header";
import { requireAdminSession } from "@/lib/server/session";

export const metadata = { title: "Activity log" };

export default async function ActivityPage() {
  const admin = await requireAdminSession();
  const entries = await listRecentAudit(admin, 100);
  return (
    <>
      <PageHeader
        title="Activity log"
        description="Last 100 administrative actions. Entries cannot be edited or deleted."
      />
      <Card>
        {entries.length === 0 ? (
          <p className="text-sm text-gray-500">No activity yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-gray-500 uppercase">
                <tr>
                  <th className="py-2 pr-4">Date</th>
                  <th className="py-2 pr-4">Action</th>
                  <th className="py-2 pr-4">Entity</th>
                  <th className="py-2 pr-4">Actor</th>
                  <th className="py-2">IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {entries.map((entry) => (
                  <tr key={entry.id}>
                    <td className="py-2 pr-4 whitespace-nowrap text-gray-600">
                      {entry.createdAt.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}
                    </td>
                    <td className="py-2 pr-4 font-mono text-xs">{entry.action}</td>
                    <td className="py-2 pr-4 text-gray-600">{entry.entityType}</td>
                    <td className="py-2 pr-4 text-gray-600">
                      {entry.actorType === "ADMIN" ? "Admin" : `System (${entry.actorId ?? "—"})`}
                    </td>
                    <td className="py-2 text-gray-500">{entry.ipAddress ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
