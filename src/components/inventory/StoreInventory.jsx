import React, { useMemo, useState } from "react";
import { Box, Button, IconButton, TextField, Paper, Typography } from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { format } from "date-fns";
import { useSnackbar } from "notistack";
import { Edit, Plus, Trash2 } from "lucide-react";

import useDebounce from "../../hooks/useDebounce";
import { useDeleteInventoryMutation, useInventoryQuery } from "../../hooks/useInventoryQuery";
import StoreInventoryDialog from "./StoreInventoryDialog";

function StoreInventory() {
    const { enqueueSnackbar } = useSnackbar();

    const [page, setPage] = useState(0); // DataGrid is 0-based
    const [pageSize, setPageSize] = useState(10);

    const [open, setOpen] = useState(false);
    const [selectedData, setSelectedData] = useState(null);

    const [refetchKey, setRefetchKey] = useState(0);

    const [search, setSearch] = useState("");
    const debouncedSearch = useDebounce(search, 300);

    const [startDate, setStartDate] = useState(null);
    const [endDate, setEndDate] = useState(null);

    const queryParams = useMemo(() => {
        const start = startDate ? format(new Date(startDate), "yyyy-MM-dd") : "";
        const end = endDate ? format(new Date(endDate), "yyyy-MM-dd") : "";

        return {
            page: page + 1, // backend usually 1-based
            limit: pageSize,
            search: debouncedSearch || "",
            startDate: start && end ? start : "",
            endDate: start && end ? end : "",
            refetchKey,
        };
    }, [page, pageSize, debouncedSearch, startDate, endDate, refetchKey]);

    const { data: apiRes, isLoading, isFetching, error } = useInventoryQuery(queryParams);

    // normalize response
    const list = apiRes?.data || apiRes || [];
    const totalCount = apiRes?.total || apiRes?.count || 0;

    // DataGrid rows must have `id`
    const rows = useMemo(() => {
        const arr = Array.isArray(list) ? list : [];

        return arr.map((record, idx) => {
            const vp = record?.vendorPurchase || {};

            return {
                // DataGrid row id
                id: vp?._id || record?._id || idx,

                // S.NO for current page
                sno: page * pageSize + idx + 1,

                // Flatten vendorPurchase
                date: vp?.date || "",
                invoiceNo: vp?.invoiceNo || "",
                vendorName: vp?.vendorName || "",
                gatePassNumber: vp?.gatePassNumber || "",
                vendorValue: vp?.vendorValue ?? "",

                // Keep full record for complex cells/actions
                items: record?.items || [],
                _raw: record,
            };
        });
    }, [list, page, pageSize]);


    const deleteMutation = useDeleteInventoryMutation();

    const deleteItem = async (id) => {
        try {
            const res = await deleteMutation.mutateAsync(id);

            enqueueSnackbar(res?.message || res?.data?.message || "Deleted successfully", {
                variant: "success",
            });

            // invalidateQueries already refetches, but keeping your refetchKey pattern is fine
            setRefetchKey((p) => p + 1);
        } catch (err) {
            enqueueSnackbar(err?.response?.data?.message || "Delete failed", {
                variant: "error",
            });
        }
    };

    const columns = useMemo(
        () => [
            {
                field: "sno",
                headerName: "S.NO",
                width: 60,
                align: "center",
                headerAlign: "center",
                sortable: false,
                cellClassName: "dg-center",
            },
            {
                field: "date",
                headerName: "Date",
                width: 120,
                align: "center",
                headerAlign: "center",
                cellClassName: "dg-center",
                renderCell: (params) =>
                    params.value ? new Date(params.value).toLocaleDateString() : "-",
            },
            {
                field: "invoiceNo",
                headerName: "Invoice",
                width: 120,
                align: "center",
                headerAlign: "center",
                cellClassName: "dg-center",
            },
            {
                field: "vendorName",
                headerName: "Vendor",
                width: 160,
                align: "center",
                headerAlign: "center",
                cellClassName: "dg-center",
            },
            {
                field: "gatePassNumber",
                headerName: "GP Number",
                width: 120,
                align: "center",
                headerAlign: "center",
                cellClassName: "dg-center",
            },
            {
                field: "vendorValue",
                headerName: "Amount",
                width: 120,
                align: "center",
                headerAlign: "center",
                cellClassName: "dg-center",
            },
            {
                field: "stocks",
                headerName: "Stocks",
                width: 130,
                sortable: false,
                headerAlign: "center",
                cellClassName: "dg-center",
                renderCell: (params) => (
                    <Box
                        sx={{
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "center",
                            height: "100%",
                            textAlign: "center",
                        }}
                    >
                        {(params.row?.items || []).map((it) => (
                            <Typography key={it._id} variant="body2">
                                {it.stock}
                            </Typography>
                        ))}
                    </Box>
                ),
            },
            {
                field: "itemsCol",
                headerName: "Items",
                width: 220,
                sortable: false,
                headerAlign: "center",
                cellClassName: "dg-center",
                renderCell: (params) => (
                    <Box
                        sx={{
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "center",
                            height: "100%",
                            textAlign: "center",
                        }}
                    >
                        {(params.row?.items || []).map((it) => (
                            <Typography key={it._id} variant="body2">
                                {it.itemName}
                            </Typography>
                        ))}
                    </Box>
                ),
            },
            {
                field: "mrp",
                headerName: "MRP",
                width: 120,
                sortable: false,
                headerAlign: "center",
                cellClassName: "dg-center",
                renderCell: (params) => (
                    <Box
                        sx={{
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "center",
                            height: "100%",
                            textAlign: "center",
                        }}
                    >
                        {(params.row?.items || []).map((it) => (
                            <Typography key={it._id} variant="body2">
                                {it.sellingPrice}
                            </Typography>
                        ))}
                    </Box>
                ),
            },
            {
                field: "actions",
                headerName: "Actions",
                width: 140,
                sortable: false,
                filterable: false,
                headerAlign: "center",
                cellClassName: "dg-center",
                renderCell: (params) => {
                    const id = params.row.id;

                    return (
                        <Box
                            sx={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                height: "100%",
                                gap: 1,
                            }}
                        >
                            <IconButton
                                size="small"
                                onClick={() => {
                                    setSelectedData(params.row._raw);
                                    setOpen(true);
                                }}
                            >
                                <Edit size={18} />
                            </IconButton>

                            <IconButton
                                size="small"
                                onClick={() => deleteItem(id)}
                                disabled={deleteMutation.isPending}
                            >
                                <Trash2 size={18} />
                            </IconButton>
                        </Box>
                    );
                },
            },
        ],
        [page, pageSize, deleteMutation.isPending]
    );



    return (
        <Box className="w-full bg-gray-50 p-4 md:p-6 lg:p-8">
            <Box className="max-w-8xl mx-auto" sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {/* Top Bar */}
                <Box display="flex" justifyContent="space-between" alignItems="center" gap={2}>
                    <Box display="flex" gap={2} alignItems="center" flexWrap="wrap">
                        <TextField
                            label="Search"
                            size="small"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />

                        <LocalizationProvider dateAdapter={AdapterDateFns}>
                            <DatePicker
                                label="Start Date"
                                value={startDate}
                                onChange={(v) => setStartDate(v)}
                                slotProps={{ textField: { size: "small" } }}
                            />
                            <DatePicker
                                label="End Date"
                                value={endDate}
                                onChange={(v) => setEndDate(v)}
                                slotProps={{ textField: { size: "small" } }}
                            />
                        </LocalizationProvider>

                        {error ? (
                            <Typography color="error" variant="body2">
                                {error?.response?.data?.message || error?.message || "Failed to load"}
                            </Typography>
                        ) : null}
                    </Box>

                    <Button variant="contained" onClick={() => { setOpen(true); setSelectedData(null) }} startIcon={<Plus size={18} />}>
                        Create Inventory
                    </Button>
                </Box>

                {/* Grid */}
                <Box sx={{ height: 500, width: "100%", bgcolor: "white", borderRadius: 2 }}>

                    <DataGrid
                        rows={rows}
                        columns={columns}
                        loading={isLoading || isFetching}
                        pagination
                        paginationMode="server"
                        rowCount={totalCount}
                        pageSizeOptions={[5, 10, 20, 50]}
                        paginationModel={{ page, pageSize }}
                        onPaginationModelChange={(model) => {
                            setPage(model.page);
                            setPageSize(model.pageSize);
                        }}
                        disableRowSelectionOnClick
                        autoHeight
                        sx={{
                            border: 0,
                            "& .MuiDataGrid-columnHeaders": { backgroundColor: "#f9fafb" },
                        }}
                    />
                </Box>
            </Box>

            <StoreInventoryDialog open={open} setOpen={setOpen} selectedData={selectedData} />
        </Box>
    );
}

export default StoreInventory;
