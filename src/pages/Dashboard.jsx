import {
  Users,
  Wallet,
  ArrowLeftRight,
  IndianRupee,
  AlertTriangle,
} from "lucide-react";
import { useDashboardQuery } from "../hooks/useDashboardQuery";

function StatCard({ title, value, icon: Icon, color }) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl p-5 shadow-md bg-linear-to-br ${color}`}
    >
      <div className="absolute right-4 top-4 opacity-20">
        <Icon size={70} />
      </div>

      <p className="text-sm text-white/80">{title}</p>
      <h2 className="text-3xl font-bold text-white mt-2">{value ?? 0}</h2>
    </div>
  );
}

export default function Dashboard() {
  const { data, isLoading } = useDashboardQuery();
  const dash = data?.data;

  if (isLoading) {
    return <div className="p-6 text-gray-500">Loading dashboard...</div>;
  }

  return (
    <div className="bg-slate-100 space-y-6 p-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">
          Dashboard Overview
        </h1>
        <p className="text-sm text-slate-500">
          Real-time school financial statistics
        </p>
      </div>

      {/* 🔢 Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
        <StatCard
          title="Total Students"
          value={dash?.totalInmates}
          icon={Users}
          color="from-blue-500 to-blue-600"
        />

        <StatCard
          title="Wallet Balance"
          value={`₹ ${dash?.totalBalance}`}
          icon={Wallet}
          color="from-emerald-500 to-emerald-600"
        />

        <StatCard
          title="Today's Transactions"
          value={dash?.todayTransactionCount}
          icon={ArrowLeftRight}
          color="from-violet-500 to-violet-600"
        />

        <StatCard
          title="Today's Sales"
          value={`₹ ${dash?.totalSalesToday}`}
          icon={IndianRupee}
          color="from-orange-500 to-orange-600"
        />
      </div>

      {/* 📊 Second Row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Recent Transactions */}
        <div className="xl:col-span-2 bg-white rounded-2xl shadow-sm border">
          <div className="p-5 border-b flex items-center justify-between">
            <h2 className="text-lg font-bold">Recent Transactions</h2>
            <span className="text-xs text-slate-400">Latest 5</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="text-left p-4">Student</th>
                  <th className="text-left p-4">Reg No</th>
                  <th className="text-left p-4">Amount</th>
                  <th className="text-left p-4">Type</th>
                  <th className="text-left p-4">Status</th>
                  <th className="text-left p-4">Date</th>
                </tr>
              </thead>

              <tbody>
                {dash?.recentTransactions?.map((tx) => (
                  <tr
                    key={tx._id}
                    className="border-t hover:bg-slate-50 transition"
                  >
                    <td className="p-4 font-medium">
                      {tx.details?.student_id?.student_name}
                    </td>
                    <td className="p-4">
                      {tx.details?.student_id?.registration_number}
                    </td>
                    <td className="p-4 font-semibold text-green-600">
                      ₹ {tx.totalAmount}
                    </td>
                    <td className="p-4">{tx.type}</td>
                    <td className="p-4">
                      <span className="px-2 py-1 rounded-full bg-green-100 text-green-700 text-xs">
                        {tx.details?.status}
                      </span>
                    </td>
                    <td className="p-4 text-slate-500">
                      {new Date(tx.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 🚨 Low Balance Alerts */}
        <div className="bg-white rounded-2xl shadow-sm border">
          <div className="p-5 border-b flex items-center gap-2">
            <AlertTriangle className="text-red-500" />
            <h2 className="text-lg font-bold">Low Balance Alerts</h2>
          </div>

          <div className="p-5 space-y-4">
            {dash?.lowBalanceInmates?.length === 0 ? (
              <div className="text-sm text-slate-500">
                No low balance students 🎉
              </div>
            ) : (
              dash.lowBalanceInmates.map((s) => (
                <div
                  key={s._id}
                  className="flex items-center justify-between border rounded-xl p-3 hover:shadow-sm"
                >
                  <div>
                    <p className="font-semibold">
                      {s.student_name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {s.registration_number}
                    </p>
                  </div>

                  <span className="text-red-600 font-bold">
                    ₹ {s.deposite_amount}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
