import { useMemo, useState } from "react";
import { Box, Chip, MenuItem, Select, FormControl, InputLabel } from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import { useTransactionsQuery } from "../hooks/useTransactionsQuery";
import { formatDate } from "../hooks/useFormatDate";

export default function TransactionHistory() {
    const [range, setRange] = useState("daily");

    // DataGrid uses 0-based page
    const [page, setPage] = useState(0);
    const [pageSize, setPageSize] = useState(10);

    const apiPage = page + 1;

    const { data, isLoading, isFetching } = useTransactionsQuery({
        range,
        page: apiPage,
        limit: pageSize,
    });

    const transactions = data?.transactions ?? [];
    const total = data?.count ?? 0;

    const rows = useMemo(() => {
        return transactions.map((t) => {
            const studentName = t?.student_id?.student_name || "-";
            const regNo = t?.student_id?.registration_number || "-";

            const categories = t?.products?.length
                ? [...new Set(t.products.map((p) => p?.productId?.category).filter(Boolean))]
                : [];

            const totalItems = t?.products?.length
                ? t.products.reduce((sum, p) => sum + (p?.quantity || 0), 0)
                : 0;

            const amount = t.totalAmount || t.wageAmount || t.depositAmount || 0;

            return {
                id: t._id,
                student: `${studentName} - ${regNo}`,
                products: t.products || [],
                totalItems,
                categories,
                amount,
                createdAt: t.createdAt,
                source: t.source || "-",
                status: t.isReversed || t.status === "reversed" ? "reversed" : t.status || "Completed",
                raw: t,
            };
        });
    }, [transactions]);

    const columns = useMemo(
        () => [
            {
                field: "student",
                headerName: "Student ID",
                flex: 1,
                minWidth: 180,
            },
            {
                field: "products",
                headerName: "Transaction",
                flex: 2,
                minWidth: 300,
                sortable: false,
                //     const row = params.row;
                //     const tx = row.raw;

                //     if (tx.source === "FINANCIAL") {
                //         // Financial: show deposit/withdrawal/work details like your old UI

                //             if(tx.type === "CREDIT" && tx.depositType === "ONLINE_PAYMENT"){
                //             <div className="whitespace-normal wrap-break-word leading-5 py-2">
                //                 <div>
                //                     <b>Online Payment</b>{" "}
                //                     {/* <span className="text-gray-600">{tx?.workAssignId?.name || "-"}</span> */}
                //                 </div>
                //             </div>
                //         }
                //         if (tx.type === "deposit") {
                //             return (
                //                 <div className="whitespace-normal wrap-break-word leading-5 py-2">
                //                     <div>
                //                         <b>Deposit Type:</b> <span className="text-gray-600">{tx.depositType || "-"}</span>
                //                     </div>
                //                     <div>
                //                         <b>Relation:</b> <span className="text-gray-600">{tx.relationShipId || "-"}</span>
                //                     </div>
                //                 </div>
                //             );
                //         }
                //         if (tx.type === "withdrawal") {
                //             return (
                //                 <div className="whitespace-normal wrap-break-word leading-5 py-2">
                //                     <div>
                //                         <b>Withdrawal Type:</b>{" "}
                //                         <span className="text-gray-600">{tx.depositType || "-"}</span>
                //                     </div>
                //                     <div>
                //                         <b>Relation:</b> <span className="text-gray-600">{tx.relationShipId || "-"}</span>
                //                     </div>
                //                 </div>
                //             );
                //         }

                //         return (
                //             <div className="whitespace-normal wrap-break-word leading-5 py-2">
                //                 <div>
                //                     <b>Work Assignment:</b>{" "}
                //                     <span className="text-gray-600">{tx?.workAssignId?.name || "-"}</span>
                //                 </div>
                //                 <div>
                //                     <b>Hours Worked:</b>{" "}
                //                     <span className="text-gray-600">{tx.hoursWorked ?? "-"}</span>
                //                 </div>
                //             </div>
                //         );
                //     }

                //     // POS/Products
                //     const products = tx.products || [];
                //     if (!products.length) return "-";

                //     return (
                //         <div className="whitespace-normal wrap-break-word leading-5 py-2">
                //             {products.map((p) => (
                //                 <div key={p._id}>
                //                     <b>{p?.productId?.itemName || "-"}</b>{" "}
                //                     <span className="text-gray-500">× {p.quantity}</span>{" "}
                //                     <span className="text-gray-400">(₹{p?.productId?.price || 0} each)</span>
                //                 </div>
                //             ))}
                //             <div className="text-xs text-gray-500 mt-1">Total items: {row.totalItems}</div>
                //         </div>
                //     );
                // },
                renderCell: (params) => {
                    const row = params.row;
                    const tx = row.raw;

                    if (tx.source === "FINANCIAL") {
                        const isOnlinePayment = tx.depositType === "ONLINE_PAYMENT";

                        // normalize "amount"
                        const amount = Number(tx.depositAmount ?? tx.amount ?? 0);
                        const isZeroAmount = amount === 0;

                        // classify by transaction string (your API uses this)
                        const txAction = String(tx.transaction || "").toUpperCase(); // e.g. "WITHDRAW"
                        const isWithdraw = txAction === "WITHDRAW" || txAction === "WITHDRAWAL";
                        const isDeposit = txAction === "DEPOSIT" || txAction === "CREDIT";

                        // ✅ Online payment
                        if (tx.type === "CREDIT" && isOnlinePayment) {
                            return (
                                <div className="whitespace-normal break-words leading-5 py-2">
                                    <div><b>Online Payment</b></div>

                                    <div>
                                        <b>Deposit Name:</b>{" "}
                                        <span className="text-gray-600">{tx.depositName || "-"}</span>
                                    </div>

                                    <div className="text-xs text-gray-500 mt-1">{tx.remarks || ""}</div>
                                </div>
                            );
                        }

                        // ✅ Withdraw (covers your CASH + WITHDRAW case)
                        if (isWithdraw) {
                            return (
                                <div className="whitespace-normal break-words leading-5 py-2">
                                    <div><b>Withdraw</b></div>

                                    <div>
                                        <b>Type:</b>{" "}
                                        <span className="text-gray-600">{tx.type || "-"}</span>
                                    </div>

                                    <div>
                                        <b>By:</b>{" "}
                                        <span className="text-gray-600">{tx.depositedByType || "-"}</span>
                                    </div>
                                </div>
                            );
                        }

                        // ✅ Deposit (generic)
                        if (isDeposit) {
                            return (
                                <div className="whitespace-normal break-words leading-5 py-2">
                                    <div><b>Deposit</b></div>

                                    <div>
                                        <b>Deposit Type:</b>{" "}
                                        <span className="text-gray-600">{tx.depositType || "-"}</span>
                                    </div>

                                    <div>
                                        <b>Deposit Name:</b>{" "}
                                        <span className="text-gray-600">{tx.depositName || "-"}</span>
                                    </div>

                                    <div>
                                        <b>Amount:</b>{" "}
                                        <span className={isZeroAmount ? "text-red-600 font-semibold" : "text-gray-600"}>
                                            ₹{amount}
                                        </span>
                                    </div>
                                </div>
                            );
                        }

                        // ✅ Final fallback for any other financial records (no more work assignment here)
                        return (
                            <div className="whitespace-normal break-words leading-5 py-2">
                                <div className="whitespace-normal wrap-break-word py-2">
                                    <div>
                                        <b>Deposit Type:</b> <span className="text-gray-600">{tx.depositType || "-"}</span>
                                    </div>
                                    <div>
                                        <b>Relation:</b> <span className="text-gray-600">{tx.relationShipId || "-"}</span>
                                    </div>
                                </div>
                            </div>
                        );
                    }

                    // ... POS/products unchanged
                    const products = tx.products || [];
                    if (!products.length) return "-";

                    return (
                        <div className="whitespace-normal break-words leading-5 py-2">
                            {products.map((p) => (
                                <div key={p._id}>
                                    <b>{p?.productId?.itemName || "-"}</b>{" "}
                                    <span className="text-gray-500">× {p.quantity}</span>{" "}
                                    <span className="text-gray-400">(₹{p?.productId?.price || 0} each)</span>
                                </div>
                            ))}
                            <div className="text-xs text-gray-500 mt-1">Total items: {row.totalItems}</div>
                        </div>
                    );
                }

            },

            // POS / Products

            {
                field: "categories",
                headerName: "Categories",
                flex: 1,
                minWidth: 200,
                sortable: false,
                renderCell: (params) => {
                    const tx = params.row.raw;

                    // Financial -> show type badge
                    if (tx.source === "FINANCIAL") {
                        return <Chip size="small" label={tx.type || "-"} variant="outlined" />;
                    }

                    const categories = params.value || [];
                    if (!categories.length) return "-";

                    return (
                        <div className="flex flex-wrap gap-1 py-2">
                            {categories.map((c) => (
                                <Chip key={c} size="small" label={c} variant="outlined" />
                            ))}
                        </div>
                    );
                },
            },
            {
                field: "amount",
                headerName: "Transfer Amount",
                flex: 0.7,
                minWidth: 160,
                renderCell: (params) => (
                    <span className={`font-semibold ${params?.value > 0
                            ? "text-green-600"
                            :  "text-red-600"
                        }`}>{params.value}</span>
                ),
            },
            {
                field: "createdAt",
                headerName: "Date",
                flex: 1,
                minWidth: 200,
                renderCell: (params) => (
                    <span>{formatDate(params.value)}</span>
                ),
            },
            {
                field: "source",
                headerName: "Source",
                flex: 0.8,
                minWidth: 140,
                renderCell: (params) => (
                    <Chip size="small" label={params.value || "-"} variant="outlined" />
                ),
            },
            {
                field: "status",
                headerName: "Status",
                flex: 0.9,
                minWidth: 180,
                sortable: false,
                renderCell: (params) => {
                    const status = params.value;
                    const isReversed = status === "reversed";

                    return (
                        <Chip
                            size="small"
                            label={isReversed ? "Transaction reversed" : status}
                            color={isReversed ? "error" : "default"}
                            variant={isReversed ? "filled" : "outlined"}
                        />
                    );
                },
            },
        ],
        []
    );

    return (
        <div className="w-full bg-gray-50 px-4 overflow-x-hidden">
            <div className="px-0 md:px-4 lg:px-8 py-4">
                <div className="max-w-8xl mx-auto space-y-6">
                    {/* Header */}
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Transaction History</h1>
                            <p className="text-gray-600 text-sm md:text-base">
                                Monitor system statistics and recent activities
                            </p>
                            <p className="text-xs text-slate-500">
                                {isFetching && !isLoading ? "Updating..." : ""}
                            </p>
                        </div>

                        {/* Range filter */}
                        <FormControl size="small" sx={{ minWidth: 160 }}>
                            <InputLabel>Range</InputLabel>
                            <Select
                                label="Range"
                                value={range}
                                onChange={(e) => {
                                    setRange(e.target.value);
                                    setPage(0);
                                }}
                            >
                                <MenuItem value="daily">Daily</MenuItem>
                                <MenuItem value="weekly">Weekly</MenuItem>
                                <MenuItem value="monthly">Monthly</MenuItem>
                                <MenuItem value="yearly">Yearly</MenuItem>
                            </Select>
                        </FormControl>
                    </div>

                    {/* Grid */}
                    <div className="bg-white rounded-xl shadow p-3">
                        <Box sx={{ height: "calc(100vh - 260px)", width: "100%" }}>
                            <DataGrid
                                rows={rows}
                                columns={columns}
                                loading={isLoading || isFetching}
                                pagination
                                paginationMode="server"
                                rowCount={total}
                                pageSizeOptions={[10, 20, 50]}
                                paginationModel={{ page, pageSize }}
                                onPaginationModelChange={(model) => {
                                    // reset page if size changes
                                    if (model.pageSize !== pageSize) {
                                        setPage(0);
                                        setPageSize(model.pageSize);
                                        return;
                                    }
                                    if (model.page !== page) setPage(model.page);
                                }}
                                disableRowSelectionOnClick
                                getRowId={(row) => row.id}
                                getRowHeight={() => "auto"} // ✅ allow multi-line cells
                                sx={{
                                    "& .MuiDataGrid-cell": {
                                        display: "flex",
                                        alignItems: "center",   // ✅ center vertically
                                        whiteSpace: "normal",
                                        lineHeight: 1.5,
                                        py: 1,
                                    },
                                    "& .MuiDataGrid-columnHeaders": { backgroundColor: "#f8fafc" },
                                }}
                            />
                        </Box>
                    </div>
                </div>
            </div>
        </div>
    );
}
