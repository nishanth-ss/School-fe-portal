import { useEffect, useMemo, useState } from "react";
import { Box, TextField, InputAdornment } from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import { Edit, Plus, Search, Trash2 } from "lucide-react";
import { useSnackbar } from "notistack";

import useDebounce from "../hooks/useDebounce";
import { useDeleteStudentMutation, useStudentsQuery } from "../hooks/useStudentExactQuery";
import StudentFormModal from "../components/student/StudentFormModal";
import DummyProfile from "../assets/dummy.png";
import { formatDate } from "../hooks/useFormatDate";
import ConfirmDeleteDialog from "../components/commonModals/ConfirmDeleteDialog";

// ✅ Face Component (render in parent)
import FaceRecognition from "../components/faceIdComponent/FaceID";

export default function StudentManagement() {
  const { enqueueSnackbar } = useSnackbar();

  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);

  const [open, setOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [faceidModalOpen, setFaceidModalOpen] = useState(false);
  const [faceIdData, setFaceIdData] = useState(null);

  const apiPage = page + 1;

  const deleteStudentMutation = useDeleteStudentMutation();
  const { data, isLoading, isFetching } = useStudentsQuery({
    search: debouncedSearch,
    page: apiPage,
    limit: pageSize,
  });

  const list = data?.data ?? [];
  const total = list?.[0]?.totalItems ?? 0;

  const rows = useMemo(() => {
    return list.map((s) => ({
      id: s._id,
      registration_number: s.registration_number || "-",
      student_name: s.student_name || "-",
      father_name: s.father_name || "-",
      gender: s.gender || "-",
      class_name: s?.class_info?.class_name || "-",
      section: s?.class_info?.section || "-",
      academic_year: s?.class_info?.academic_year || "-",
      deposite_amount: s?.deposite_amount ?? 0,
      pro_pic: s?.pro_pic?.file_url || null,
      createdAt: s.createdAt,

      // needed in modal
      mother_name: s?.mother_name,
      birth_place: s?.birth_place || "",
      nationality: s?.nationality || "",
      mother_tongue: s?.mother_tongue || "",
      blood_group: s?.blood_group || "",
      religion: s?.religion || "",
      contact_number: s?.contact_number || "",
      date_of_birth: s?.date_of_birth,
      class_info: {
        class_name: s?.class_info?.class_name || "",
        section: s?.class_info?.section || "",
        academic_year: s?.class_info?.academic_year || "",
      },

      // ✅ IMPORTANT: include user_id if you need it for FaceID save/delete
      user_id: s?.user_id,
      descriptor: s?.descriptor || [],
    }));
  }, [list]);

  const handleEdit = (row) => {
    setSelectedStudent(row);
    setOpen(true);
  };

  const openDeleteModal = (row) => {
    setSelectedStudent(row);
    setDeleteOpen(true);
  };

  const closeDeleteModal = () => {
    setDeleteOpen(false);
    setSelectedStudent(null);
  };

  const confirmDelete = async () => {
    if (!selectedStudent?.id) return;

    try {
      await deleteStudentMutation.mutateAsync(selectedStudent.id);
      enqueueSnackbar("Student deleted successfully", { variant: "success" });
      closeDeleteModal();
    } catch (err) {
      enqueueSnackbar(err?.response?.data?.message || "Delete failed", { variant: "error" });
    }
  };

  const columns = useMemo(
    () => [
      { field: "registration_number", headerName: "Reg No", width: 120 },
      { field: "student_name", headerName: "Student Name", flex: 1, minWidth: 150 },
      { field: "father_name", headerName: "Father Name", flex: 1, minWidth: 150 },
      { field: "contact_number", headerName: "Contact", width: 140 },
      { field: "gender", headerName: "Gender", width: 100 },
      {
        field: "class",
        headerName: "Class",
        width: 120,
        valueGetter: (_, row) => `${row.class_name} - ${row.section}`,
        sortable: false,
      },
      { field: "academic_year", headerName: "Year", width: 130 },
      {
        field: "deposite_amount",
        headerName: "Balance",
        width: 100,
        renderCell: (params) => (
          <span className="font-semibold text-green-700">₹{params.value}</span>
        ),
      },
      {
        field: "createdAt",
        headerName: "Created",
        width: 190,
        renderCell: (params) => <span>{formatDate(params.value)}</span>,
      },
      {
        field: "action",
        headerName: "Action",
        width: 140,
        sortable: false,
        filterable: false,
        align: "center",
        renderCell: (params) => (
          <div className="flex items-center justify-center h-full w-full gap-3">
            <button
              onClick={() => handleEdit(params.row)}
              style={{ border: "none", background: "transparent", cursor: "pointer", color: "#1976d2" }}
            >
              <Edit />
            </button>

            <button
              onClick={() => openDeleteModal(params.row)}
              style={{ border: "none", background: "transparent", cursor: "pointer", color: "red" }}
            >
              <Trash2 />
            </button>
          </div>
        ),
      },
    ],
    []
  );

  return (
    <div className="w-full bg-gray-50 overflow-x-hidden">
      <div className="px-4 md:px-6 lg:px-8 py-4">
        <div className="max-w-8xl mx-auto space-y-4">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Student Management</h1>
              <p className="text-gray-600 text-sm">Search and manage student records</p>
              <p className="text-xs text-slate-500">{isFetching && !isLoading ? "Updating..." : ""}</p>
            </div>

            <div className="flex items-center gap-4">
              <TextField
                size="small"
                placeholder="Search student name"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(0);
                }}
                sx={{ minWidth: 320 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search size={18} />
                    </InputAdornment>
                  ),
                }}
              />

              <button
                className="bg-primary p-2 px-4 text-white rounded-md flex items-center gap-2"
                onClick={() => {
                  setSelectedStudent(null);
                  setOpen(true);
                }}
              >
                <Plus /> Add Student
              </button>
            </div>
          </div>

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
                  if (model.pageSize !== pageSize) {
                    setPage(0);
                    setPageSize(model.pageSize);
                    return;
                  }
                  setPage(model.page);
                }}
                disableRowSelectionOnClick
                sx={{
                  "& .MuiDataGrid-columnHeaders": { backgroundColor: "#f8fafc" },
                }}
              />
            </Box>
          </div>
        </div>
      </div>

      <StudentFormModal
        open={open}
        onClose={() => {setOpen(false);setSelectedStudent(null);}}
        selectedStudent={selectedStudent}
        DummyProfile={DummyProfile}
        faceidModalOpen={faceidModalOpen}
        setFaceidModalOpen={setFaceidModalOpen}
        faceIdData={faceIdData}
        setFaceIdData={setFaceIdData}
      />

      <ConfirmDeleteDialog
        open={deleteOpen}
        title="Delete Student"
        description="Are you sure you want to delete this user? This action cannot be undone."
        itemName={selectedStudent?.student_name}
        subText={selectedStudent?.registration_number}
        onClose={closeDeleteModal}
        onConfirm={confirmDelete}
        loading={deleteStudentMutation.isPending}
      />

      {/* Face Recognition Component */}
      {faceidModalOpen && (
        <FaceRecognition mode="register" open={faceidModalOpen} setOpen={setFaceidModalOpen} faceIdData={faceIdData} setFaceIdData={setFaceIdData} />
      )}
    </div>
  );
}
