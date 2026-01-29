import { useEffect, useMemo, useState } from "react";
import { useSnackbar } from "notistack";
import { Controller, useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";

import {
  Card,
  CardContent,
  Typography,
  Box,
  TextField,
  Button,
  MenuItem,
  Divider,
} from "@mui/material";

import { useStudentExactQuery } from "../hooks/useStudentExactQuery";
import { useCreateDepositMutation } from "../hooks/useCreateDepositMutation";
import useDebounce from "../hooks/useDebounce";
import { StudentPanel } from "../components/finanicalManagement/StudentPanel";
import { EmptyStudentPanel } from "../components/finanicalManagement/EmptyStudentPanel";

const schema = yup.object({
  exactData: yup.string().required("Student ID is required"), // STU001
  depositedBy: yup.string().required("Deposited By is required"),
  depositType: yup.string().required("Deposit Type is required"),
  relationShipId: yup.string().required("Relationship is required"),
  depositAmount: yup
    .number()
    .typeError("Deposit amount must be a number")
    .positive("Amount must be positive")
    .required("Deposit amount is required"),
  contactNumber: yup
    .string()
    .matches(/^[0-9]{10}$/, "Must be a valid 10-digit number")
    .required("Contact Number is required"),
  remarks: yup.string().required("Remarks are required"),
});

export default function FinancialManagement() {
  const { enqueueSnackbar } = useSnackbar();

  const [searchValue, setSearchValue] = useState(""); // STU001 typed

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    reset,
    watch,
    control
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      exactData: "",
      depositedBy: "",
      depositType: "",
      relationShipId: "",
      depositAmount: "",
      contactNumber: "",
      remarks: "",
    },
  });

  // watch the exactData field (student search)
  const exactData = watch("exactData");

  const debouncedStudentId = useDebounce(exactData, 600);
  // student search query
  const studentQuery = useStudentExactQuery(debouncedStudentId);
  const student = studentQuery.data?.data?.[0] || null;

  const mutation = useCreateDepositMutation();


  // show warning when no student
  const showStudentPanel = useMemo(() => !!student, [student]);

  const onSubmit = (values) => {
    if (!student?._id) {
      enqueueSnackbar("Please enter a valid Student ID (e.g. STU001)", {
        variant: "warning",
      });
      return;
    }

    const payload = {
      student_id: student._id,
      depositType: values.depositType,
      depositAmount: Number(values.depositAmount),
      relationShipId: values.relationShipId,
      depositedBy: values.depositedBy,
      depositedByType: "", // you can add field later
      contactNumber: values.contactNumber,
      remarks: values.remarks,
      status: "completed",
      type: "deposit",
    };

    mutation.mutate(payload, {
      onSuccess: (res) => {
        if (res?.success) {
          enqueueSnackbar("Deposit processed successfully", { variant: "success" });
          reset({
            exactData: "",
            depositedBy: "",
            depositType: "",
            relationShipId: "",
            depositAmount: "",
            contactNumber: "",
            remarks: "",
          }); // clears form
          setSearchValue("");
        } else {
          enqueueSnackbar(res?.message || "Deposit failed", { variant: "error" });
        }
      },
      onError: (err) => {
        enqueueSnackbar(err?.response?.data?.message || "Deposit failed", {
          variant: "error",
        });
      },
    });
  };

  return (
    <Card className="bg-white shadow-sm">
      {/* Header */}
      <Box className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between p-4">
        <Box className="min-w-0">
          <Typography variant="h6" fontWeight={700} className="truncate">
            Deposit Processing
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Search student and process deposit
          </Typography>
        </Box>

        {showStudentPanel && (
          <Box className="sm:text-right">
            <Typography
              variant="body2"
              fontWeight={600}
              color="success.main"
              className="break-words"
            >
              Student: {student.student_name} {student.father_name}
            </Typography>

            <Typography variant="body2" fontWeight={700} color="success.main">
              Balance: ₹{student.deposite_amount ?? 0}
            </Typography>

            <Typography variant="caption" color="text.secondary" className="break-words">
              Class: {student?.class_info?.class_name ?? "-"} {student?.class_info?.section ?? "-"} (
              {student?.class_info?.academic_year ?? "-"})
            </Typography>
          </Box>
        )}
      </Box>

      <Divider />

      <CardContent>
        {/* ✅ Responsive grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Left side form */}
          <div className="flex flex-col gap-3">
            {/* Student Search */}
            <Box>
              <Typography variant="subtitle2" className="mb-1">
                Student ID
              </Typography>

              <TextField
                fullWidth
                size="small"
                placeholder="Enter exact student id (ex: STU001)"
                value={searchValue}
                onChange={(e) => {
                  const val = e.target.value.toUpperCase();
                  setSearchValue(val);
                  setValue("exactData", val, { shouldValidate: true });
                }}
                error={!!errors.exactData}
                helperText={errors.exactData?.message}
              />

              <div className="mt-1 text-xs text-gray-500">
                {studentQuery.isFetching ? "Searching..." : ""}
                {!studentQuery.isFetching && exactData?.length >= 3 && !student && (
                  <span className="text-red-500">No student found</span>
                )}
              </div>
            </Box>

            {/* Deposited By */}
            <TextField
              label="Deposited By"
              size="small"
              fullWidth
              {...register("depositedBy")}
              error={!!errors.depositedBy}
              helperText={errors.depositedBy?.message}
            />

            {/* Deposit Type */}
            <Controller
              name="depositType"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Deposit Type"
                  size="small"
                  fullWidth
                  select
                  error={!!errors.depositType}
                  helperText={errors.depositType?.message}
                >
                  <MenuItem value="">Select</MenuItem>
                  <MenuItem value="cash">Cash</MenuItem>
                  <MenuItem value="cheque">Cheque</MenuItem>
                  <MenuItem value="online">Online</MenuItem>
                </TextField>
              )}
            />

            {/* Relationship */}
            <Controller
              name="relationShipId"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Relationship"
                  size="small"
                  fullWidth
                  select
                  error={!!errors.relationShipId}
                  helperText={errors.relationShipId?.message}
                >
                  <MenuItem value="">Select</MenuItem>
                  <MenuItem value="mother">Mother</MenuItem>
                  <MenuItem value="father">Father</MenuItem>
                  <MenuItem value="sibling">Sibling</MenuItem>
                  <MenuItem value="teacher">Teacher</MenuItem>
                  <MenuItem value="friend">Friend</MenuItem>
                  <MenuItem value="other">Other</MenuItem>
                </TextField>
              )}
            />

            {/* Deposit Amount */}
            <TextField
              label="Deposit Amount"
              size="small"
              fullWidth
              type="number"
              {...register("depositAmount")}
              error={!!errors.depositAmount}
              helperText={errors.depositAmount?.message}
              onWheel={(e) => e.target.blur()}
            />

            {/* Contact Number */}
            <TextField
              label="Contact Number"
              size="small"
              fullWidth
              {...register("contactNumber")}
              error={!!errors.contactNumber}
              helperText={errors.contactNumber?.message}
            />

            {/* Remarks */}
            <TextField
              label="Remarks"
              size="small"
              fullWidth
              {...register("remarks")}
              error={!!errors.remarks}
              helperText={errors.remarks?.message}
            />

            <Button
              variant="contained"
              fullWidth
              onClick={handleSubmit(onSubmit)}
              disabled={mutation.isPending}
              sx={{
                backgroundColor: "#16a34a",
                "&:hover": { backgroundColor: "#15803d" },
                py: 1.2,
                fontWeight: 700,
              }}
            >
              {mutation.isPending ? "Processing..." : "Process Deposit"}
            </Button>
          </div>

          {/* Right side panel */}
          <div className="min-w-0">
            {showStudentPanel ? <StudentPanel student={student} /> : <EmptyStudentPanel />}
          </div>
        </div>
      </CardContent>
    </Card>

  );
}
