import React, { useEffect, useMemo, useRef, useState } from "react";
import { Search } from "lucide-react";
import { Box, Paper, Typography, TextField, Button, Divider } from "@mui/material";
import { useSnackbar } from "notistack";

import {
    useCreatePosCartMutation,
    usePostCartQuery,
    useReversePostCartMutation,
    useTuckShopItemsQuery,
} from "../hooks/usePostCartQuery";

import { useStudentExactQuery } from "../hooks/useStudentExactQuery";
import useDebounce from "../hooks/useDebounce";

import PosLeftCard from "../components/pos/PosLeftCard";
import { useLocationCtx } from "../context/LocationContext";
import FaceRecognition from "../components/faceIdComponent/FaceID";
import { fetchStudentByFace } from "../service/studentService";

const CanteenPosSystem = () => {
    const { enqueueSnackbar } = useSnackbar();

    // =========================
    // Recent Purchases (TOP)
    // =========================
    const [purchaseSearch, setPurchaseSearch] = useState("");
    const [refetchKey, setRefetchKey] = useState(0);
    const [openFaceId, setOpenFaceId] = useState(false);
    const [faceidData, setFaceIdData] = useState(null);

    const {
        data: purchasesData,
        error: purchasesError,
        isLoading: purchasesLoading,
        isFetching: purchasesFetching,
    } = usePostCartQuery({ refetchKey });
    const { selectedLocation } = useLocationCtx();

    // IMPORTANT:
    // If your hook returns array directly, keep purchasesData || []
    // If your hook returns { success, data }, keep purchasesData?.data || []
    const purchases = purchasesData?.data || purchasesData || [];

    const reverseMutation = useReversePostCartMutation();
    const fetchingFaceRef = useRef(false);
    const selectedInmateIdRef = useRef(null);

    useEffect(() => {
        if (!faceidData) return;

        // ✅ stop repeated calls if FaceRecognition emits multiple times
        if (fetchingFaceRef.current) return;
        fetchingFaceRef.current = true;

        let alive = true;

        (async () => {
            try {
                const res = await fetchStudentByFace(faceidData);

                if (!alive) return;

                const student = res?.data;
                if (student?._id) {
                    selectedInmateIdRef.current = student._id;
                    setStudentSearchValue(student.registration_number || "");
                } else {
                    enqueueSnackbar(res?.message || "Student not found", { variant: "warning" });
                }
            } catch (err) {
                if (!alive) return;
                console.log(err);
                
                enqueueSnackbar(
                    err?.response?.data?.message || "Face ID fetch failed",
                    { variant: "error" }
                );
            } finally {
                if (!alive) return;

                // ✅ close modal + clear to prevent infinite effect triggers
                setFaceIdData(null);
                setOpenFaceId(false);

                // ✅ allow new scan next time
                fetchingFaceRef.current = false;
            }
        })();

        return () => {
            alive = false;
        };
    }, [faceidData]);

    const filteredPurchases = useMemo(() => {
        const s = purchaseSearch.trim().toLowerCase();
        if (!s) return purchases;

        return (purchases || []).filter((p) => {
            const reg = (p?.student_id?.registration_number || "").toLowerCase();
            const name = (p?.student_id?.student_name || "").toLowerCase();
            return reg.includes(s) || name.includes(s);
        });
    }, [purchases, purchaseSearch]);

    const handleReverse = async (purchaseId) => {
        try {
            await reverseMutation.mutateAsync({ id: purchaseId });
            enqueueSnackbar("Purchase reversed successfully", { variant: "success" });
        } catch (err) {
            enqueueSnackbar(err?.response?.data?.message || "Failed to reverse purchase", {
                variant: "error",
            });
        }
    };

    const handleRefreshPurchases = () => setRefetchKey((p) => p + 1);

    // =========================
    // Student Search (LEFT)
    // =========================
    const [studentSearchValue, setStudentSearchValue] = useState("");
    const debouncedStudentSearchValue = useDebounce(studentSearchValue, 400);

    // ✅ YOUR HOOK expects a STRING, not an object
    const {
        data: studentsDataRaw,
        isFetching: studentFetching,
        error: studentError,
    } = useStudentExactQuery(debouncedStudentSearchValue);

    // If API returns { success, data }, unwrap it.
    // If API returns student object directly, this still works.
    const studentsData = studentsDataRaw?.data ?? studentsDataRaw;
    const findSingleStudent = !!studentsData?.[0]?._id;


    // =========================
    // Cart State (LEFT)
    // =========================
    const [cartItems, setCartItems] = useState([]);

    const removeOneItemById = (id) => {
        setCartItems((prev) => {
            const idx = prev.findIndex((x) => x?._id === id);
            if (idx === -1) return prev;
            const copy = [...prev];
            copy.splice(idx, 1);
            return copy;
        });
    };

    // Build products payload for /pos-shop-cart/create
    const productsPayload = useMemo(() => {
        const map = new Map();
        for (const item of cartItems) {
            if (!item?._id) continue;
            map.set(item._id, (map.get(item._id) || 0) + 1);
        }
        return Array.from(map.entries()).map(([productId, quantity]) => ({
            productId,
            quantity,
        }));
    }, [cartItems]);

    // =========================
    // Available Items (RIGHT)
    // =========================
    const { data: availableItemsData } = useTuckShopItemsQuery();
    const availableItems = availableItemsData?.data || availableItemsData || [];

    // =========================
    // Create Purchase (LEFT button)
    // =========================
    const createCartMutation = useCreatePosCartMutation();

    const postCartData = async (values) => {
        try {
            await createCartMutation.mutateAsync(values);
            enqueueSnackbar("Purchase processed successfully", { variant: "success" });
            setCartItems([]);
        } catch (err) {
            enqueueSnackbar(err?.response?.data?.message || "Purchase failed", {
                variant: "error",
            });
        }
    };

    return (
        <Box className="px-4">
            <Typography variant="h5" fontWeight={700}>
                Canteen POS System
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Process student purchases and manage inventory
            </Typography>

            {/* =========================
          RECENT PURCHASES (TOP)
      ========================== */}
            <Paper
                variant="outlined"
                sx={{
                    borderColor: "#3498db",
                    maxHeight: 200,
                    overflowY: "auto",
                    p: 2,
                    mb: 1,
                }}
            >
                <Box display="flex" alignItems="center" justifyContent="space-between" gap={1}>
                    <Typography variant="h6" fontWeight={700}>
                        Recent Purchases
                    </Typography>

                    <Box display="flex" gap={1} alignItems="center">
                        <TextField
                            size="small"
                            placeholder="Search by Student ID..."
                            value={purchaseSearch}
                            onChange={(e) => setPurchaseSearch(e.target.value)}
                            sx={{ width: 260 }}
                        />
                        <Button
                            variant="outlined"
                            onClick={handleRefreshPurchases}
                            disabled={purchasesFetching}
                            startIcon={<Search size={16} />}
                        >
                            {purchasesFetching ? "Refreshing..." : "Refresh"}
                        </Button>
                    </Box>
                </Box>

                <Divider sx={{ my: 2 }} />

                {purchasesLoading ? (
                    <Typography align="center" color="text.secondary" sx={{ py: 2 }}>
                        Loading purchases...
                    </Typography>
                ) : null}

                {!purchasesLoading && purchasesError && filteredPurchases.length === 0 ? (
                    <Typography color="error">
                        Error loading purchases:{" "}
                        {purchasesError?.message || purchasesError?.response?.data?.message}
                    </Typography>
                ) : null}

                {!purchasesLoading && filteredPurchases.length > 0 ? (
                    filteredPurchases.map((p) => (
                        <Box
                            key={p._id}
                            sx={{
                                py: 1,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                gap: 2,
                                flexWrap: "nowrap",
                                borderBottom: "1px solid #e5e7eb",
                            }}
                        >
                            {/* LEFT INFO */}
                            <Box
                                sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 2,
                                    overflow: "hidden",
                                    whiteSpace: "nowrap",
                                    flex: 1,
                                }}
                            >
                                {/* Student */}
                                <Typography fontWeight={700} noWrap>
                                    <span className="text-gray-500">Student:</span>{" "}
                                    {p.student_id?.student_name} -
                                    <span className="text-red-400 ml-1">
                                        {p.student_id?.registration_number}
                                    </span>
                                </Typography>

                                {/* Products */}
                                <Typography
                                    variant="body2"
                                    color="text.secondary"
                                    noWrap
                                    sx={{
                                        maxWidth: 350,
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                    }}
                                >
                                    {(p.products || [])
                                        .map(
                                            (prod) =>
                                                `${prod.productId?.itemName || "Item"} x${prod.quantity}`
                                        )
                                        .join(", ")}
                                </Typography>

                                {/* Date */}
                                <Typography
                                    variant="caption"
                                    color="text.secondary"
                                    noWrap
                                    sx={{ minWidth: 160 }}
                                >
                                    {p.createdAt ? new Date(p.createdAt).toLocaleString() : ""}
                                </Typography>
                            </Box>

                            {/* RIGHT ACTIONS */}
                            <Box
                                sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 1.5,
                                    flexShrink: 0,
                                }}
                            >
                                <Typography
                                    fontWeight={800}
                                    sx={{
                                        color: p.totalAmount < 0 ? "error.main" : "success.main",
                                        minWidth: 70,
                                        textAlign: "right",
                                    }}
                                >
                                    ₹{p.totalAmount}
                                </Typography>

                                <Button
                                    variant="contained"
                                    color="error"
                                    size="small"
                                    onClick={() => handleReverse(p._id)}
                                    disabled={p.is_reversed || reverseMutation.isPending}
                                >
                                    {reverseMutation.isPending ? "Reversing..." : "Reverse"}
                                </Button>
                            </Box>
                        </Box>

                    ))
                ) : !purchasesLoading ? (
                    <Typography align="center" color="text.secondary" sx={{ py: 2 }}>
                        No purchases found for the searched student
                    </Typography>
                ) : null}
            </Paper>

            {/* =========================
          GRID: LEFT + RIGHT
      ========================== */}
            <div className="grid grid-cols-2 gap-4">
                {/* LEFT */}
                <div>
                    <PosLeftCard
                        studentSearchValue={studentSearchValue}
                        setStudentSearchValue={setStudentSearchValue}
                        findSingleStudent={findSingleStudent}
                        studentsData={studentsData?.[0]}
                        cartItems={cartItems}
                        setCartItems={setCartItems}
                        removeOneItemById={removeOneItemById}
                        productsPayload={productsPayload}
                        onProcessPurchase={(valuesFromLeftCard) => postCartData(valuesFromLeftCard)}
                        setOpenFaceId={setOpenFaceId}
                    />

                    {/* Student fetch feedback (optional) */}
                    {studentFetching ? (
                        <p className="text-gray-500 text-sm mt-2">Searching student...</p>
                    ) : null}

                    {studentError ? (
                        <p className="text-red-500 text-sm mt-2">
                            {studentError?.response?.data?.message || studentError?.message || "Student fetch failed"}
                        </p>
                    ) : null}
                </div>

                {/* RIGHT */}
                <div>
                    <Paper variant="outlined" sx={{ borderColor: "#3498db", p: 2 }}>
                        <Typography variant="h6" fontWeight={700} sx={{ mb: 1 }}>
                            Available Items
                        </Typography>

                        <div className="space-y-2 max-h-[380px] overflow-y-auto">
                            {availableItems?.length ? (
                                availableItems.map((item) => (
                                    <div
                                        key={item._id}
                                        className="flex justify-between items-center p-3 rounded-lg cursor-pointer hover:bg-gray-50 border border-[#3498db]"
                                        onClick={() => setCartItems((prev) => [...prev, item])}
                                    >
                                        <div>
                                            <div className="font-medium">{item.itemName}</div>
                                            <div className="text-sm text-gray-500">Stock: {item.stockQuantity}</div>
                                        </div>
                                        <div className="font-medium">₹{item.price}</div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-gray-500 text-center py-6">No items available</p>
                            )}
                        </div>
                    </Paper>
                </div>
            </div>

            {openFaceId && (
                <FaceRecognition mode="match" open={openFaceId} setOpen={setOpenFaceId} setFaceIdData={setFaceIdData} />
            )}
        </Box>
    );
};

export default CanteenPosSystem;
