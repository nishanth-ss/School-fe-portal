import { useEffect, useMemo, useState, useCallback } from "react";
import {
    Modal,
    Box,
    Typography,
    Avatar,
    Button as MuiButton,
    TextField,
    MenuItem,
    Divider,
    Fade,
    Backdrop
} from "@mui/material";
import { Camera, Trash, Trash2 } from "lucide-react";
import { useSnackbar } from "notistack";

import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { useCreateStudentMutation, useUpdateStudentMutation } from "../../hooks/useStudentExactQuery";
import { uploadFileApi } from "../../service/uploadFile";
import { useLocationCtx } from "../../context/LocationContext";
import FaceRecognition from "../faceIdComponent/FaceID";
import { useDeleteFaceRecognitionMutation, useUserByIdQuery } from "../../hooks/useUsersQuery";
import { useQueryClient } from "@tanstack/react-query";

const studentSchema = yup.object({
    registration_number: yup.string().required("Registration number is required"),
    student_name: yup.string().required("Student name is required"),
    father_name: yup.string().required("Father name is required"),
    mother_name: yup.string().required("Mother name is required"),
    date_of_birth: yup.string().required("Date of birth is required"),
    gender: yup.string().required("Gender is required"),
    birth_place: yup.string().required("Birth place is required"),
    nationality: yup.string().required("Nationality is required"),
    mother_tongue: yup.string().required("Mother tongue is required"),
    blood_group: yup.string().required("Blood group is required"),
    religion: yup.string().required("Religion is required"),
    contact_number: yup
        .string()
        .matches(/^[0-9]{10}$/, "Must be a valid 10-digit number")
        .required("Contact number is required"),
    class_info: yup.object({
        class_name: yup.string().required("Class name is required"),
        section: yup.string().required("Section is required"),
        academic_year: yup.string().required("Academic year is required"),
    }),
    // pro_pic optional (file)
    pro_pic: yup.mixed().nullable(),
});

const style = {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    width: "min(900px, 95vw)",
    maxHeight: "90vh",
    overflowY: "auto",
    bgcolor: "background.paper",
    borderRadius: 2,
    boxShadow: 24,
    p: 3,
};

const toDateInput = (iso) => {
    if (!iso) return "";
    return String(iso).slice(0, 10);
};

export default function StudentFormModal({
    open,
    onClose,
    selectedStudent = null, // if exists -> edit
    DummyProfile,
    faceidModalOpen,
    setFaceidModalOpen,
    faceIdData,
}) {
    const { enqueueSnackbar } = useSnackbar();
    const queryClient = useQueryClient();

    const { data, isLoading, isError } = useUserByIdQuery(selectedStudent?.user_id);

    const isEdit = !!selectedStudent?.id;

    const { selectedLocation } = useLocationCtx();

    const createMutation = useCreateStudentMutation();
    const updateMutation = useUpdateStudentMutation();

    const [profileFile, setProfileFile] = useState(null);
    const [profilePreview, setProfilePreview] = useState("");
    const deleteMutation = useDeleteFaceRecognitionMutation();


    const defaultValues = useMemo(
        () => ({
            registration_number: selectedStudent?.registration_number || "",
            student_name: selectedStudent?.student_name || "",
            father_name: selectedStudent?.father_name || "",
            mother_name: selectedStudent?.mother_name || "",
            date_of_birth: toDateInput(selectedStudent?.date_of_birth) || "",
            gender: selectedStudent?.gender || "",
            birth_place: selectedStudent?.birth_place || "",
            nationality: selectedStudent?.nationality || "",
            mother_tongue: selectedStudent?.mother_tongue || "",
            blood_group: selectedStudent?.blood_group || "",
            religion: selectedStudent?.religion || "",
            contact_number: selectedStudent?.contact_number || "",
            class_info: {
                class_name: selectedStudent?.class_info?.class_name || "",
                section: selectedStudent?.class_info?.section || "",
                academic_year: selectedStudent?.class_info?.academic_year || "",
            },
            pro_pic: null,
        }),
        [selectedStudent]
    );

    const {
        register,
        handleSubmit,
        formState: { errors },
        reset,
        setValue,
        watch,
    } = useForm({
        resolver: yupResolver(studentSchema),
        defaultValues,
    });

    // Reset form when modal opens / selectedStudent changes
    useEffect(() => {
        reset(defaultValues);

        // preview: if editing and backend has existing image
        const existing = `${import.meta.env.VITE_API_URL}${selectedStudent?.pro_pic}`;

        if (existing) {
            // if backend exposes static files, you may need full url:
            // setProfilePreview(`${import.meta.env.VITE_API_URL}${existing}`)
            setProfilePreview(existing);
        } else {
            setProfilePreview("");
        }

        setProfileFile(null);
    }, [defaultValues, reset, selectedStudent]);

    const handleProfileChange = async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        // preview immediately
        const reader = new FileReader();
        reader.onload = () => setProfilePreview(reader.result);
        reader.readAsDataURL(file);

        const formData = new FormData();
        formData.append("pro_pic", file);

        try {
            const { data, error } = await uploadFileApi(
                formData,
                selectedStudent?.pro_pic?._id || null
            );

            if (error) {
                enqueueSnackbar(`Upload failed: ${error}`, { variant: "error" });
                return;
            }

            const uploadedFile =
                data?.data?.[0] || data?.data;

            if (!uploadedFile?._id) {
                enqueueSnackbar("Invalid upload response", { variant: "error" });
                return;
            }

            // store file id in RHF
            setValue("pro_pic", uploadedFile._id, {
                shouldValidate: true,
            });

            enqueueSnackbar("Profile picture uploaded", {
                variant: "success",
            });
        } catch (err) {
            enqueueSnackbar("Upload error", { variant: "error" });
        }
    };

    const handleClose = () => {
        onClose?.();
        reset(defaultValues);
        setProfileFile(null);
        setProfilePreview("");
    };

    const onSubmit = (values) => {
        const payload = {
            ...values,
            class_info: values.class_info,
            pro_pic: values.pro_pic,
            deposite_amount: values?.deposite_amount ?? 0,
            location_id: selectedLocation?._id,
            descriptor: faceIdData ? faceIdData : values?.descriptor?.length > 0 ? values?.descriptor : null
        };

        if (isEdit) {
            updateMutation.mutate(
                { id: selectedStudent?.id || selectedStudent?._id, data: payload },
                {
                    onSuccess: (res) => {
                        if (res?.success === false) {
                            enqueueSnackbar(res?.message || "Failed", { variant: "error" });
                            return;
                        }
                        enqueueSnackbar("Student updated", { variant: "success" });
                        handleClose();
                    },
                    onError: (err) => {
                        enqueueSnackbar(err?.response?.data?.message || "Something went wrong", {
                            variant: "error",
                        });
                    },
                }
            );
        } else {
            createMutation.mutate(payload, {
                onSuccess: (res) => {
                    if (res?.success === false) {
                        enqueueSnackbar(res?.message || "Failed", { variant: "error" });
                        return;
                    }
                    enqueueSnackbar("Student created", { variant: "success" });
                    handleClose();
                },
                onError: (err) => {
                    enqueueSnackbar(err?.response?.data?.message || "Something went wrong", {
                        variant: "error",
                    });
                },
            });
        }
    };

    const handleModalClose = useCallback((event, reason) => {
        if (reason === 'backdropClick' || reason === 'escapeKeyDown') {
            onClose();
        }
    }, [onClose]);

    const deleteFaceId = (faceId) => {
        deleteMutation.mutate(faceId, {
            onSuccess: (res) => {

                enqueueSnackbar(res?.message || "Face deleted successfully", {
                    variant: "success",
                });
                queryClient.invalidateQueries({
                    queryKey: ["userById", selectedStudent?.user_id],
                });
            },
            onError: (err) => {
                enqueueSnackbar(
                    err?.response?.data?.message || "Delete failed",
                    { variant: "error" }
                );
            },
        });
    };

    return (
        <Modal
            open={open}
            onClose={handleModalClose}
            closeAfterTransition
            BackdropComponent={Backdrop}
            BackdropProps={{
                timeout: 300,
            }}
        >
            <Fade in={open}>
                <Box sx={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: '90%',
                    maxWidth: '800px',
                    maxHeight: '90vh',
                    overflowY: 'auto',
                    bgcolor: 'background.paper',
                    boxShadow: 24,
                    p: 3,
                    borderRadius: 1,
                }}>
                    <Typography variant="h6" mb={2} fontWeight={700}>
                        {isEdit ? "Update Student" : "Student Registration"}
                    </Typography>

                    {/* Profile Upload */}
                    <Box mt={1} textAlign="center">
                        <Avatar
                            src={profilePreview || DummyProfile}
                            alt="Profile Preview"
                            sx={{ width: 80, height: 80, margin: "auto", mb: 1 }}
                        />

                        <MuiButton variant="outlined" component="label">
                            Upload Profile
                            <input hidden accept="image/*" type="file" onChange={handleProfileChange} />
                        </MuiButton>

                        {errors.pro_pic && (
                            <Typography color="error" variant="caption" display="block" mt={1}>
                                {errors.pro_pic.message}
                            </Typography>
                        )}
                    </Box>

                    {isEdit && (
                        <Typography className="py-2" fontWeight={600}>
                            {selectedStudent?.student_name} Current Balance:{" "}
                            <span className="text-green-600 font-bold">
                                {selectedStudent?.deposite_amount ?? 0}
                            </span>
                        </Typography>
                    )}

                    <Divider sx={{ my: 2 }} />

                    <form onSubmit={handleSubmit(onSubmit)}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <TextField
                                fullWidth
                                label="Registration Number"
                                {...register("registration_number")}
                                error={!!errors.registration_number}
                                helperText={errors.registration_number?.message}
                            />

                            <TextField
                                fullWidth
                                label="Student Name"
                                {...register("student_name")}
                                error={!!errors.student_name}
                                helperText={errors.student_name?.message}
                            />

                            <TextField
                                fullWidth
                                label="Father Name"
                                {...register("father_name")}
                                error={!!errors.father_name}
                                helperText={errors.father_name?.message}
                            />

                            <TextField
                                fullWidth
                                label="Mother Name"
                                {...register("mother_name")}
                                error={!!errors.mother_name}
                                helperText={errors.mother_name?.message}
                            />

                            <TextField
                                fullWidth
                                label="Date of Birth"
                                type="date"
                                InputLabelProps={{ shrink: true }}
                                {...register("date_of_birth")}
                                error={!!errors.date_of_birth}
                                helperText={errors.date_of_birth?.message}
                            />

                            <TextField
                                select
                                fullWidth
                                label="Gender"
                                defaultValue={defaultValues.gender}
                                {...register("gender")}
                                error={!!errors.gender}
                                helperText={errors.gender?.message}
                            >
                                <MenuItem value="Male">Male</MenuItem>
                                <MenuItem value="Female">Female</MenuItem>
                                <MenuItem value="Other">Other</MenuItem>
                            </TextField>

                            <TextField
                                fullWidth
                                label="Birth Place"
                                {...register("birth_place")}
                                error={!!errors.birth_place}
                                helperText={errors.birth_place?.message}
                            />

                            <TextField
                                fullWidth
                                label="Nationality"
                                {...register("nationality")}
                                error={!!errors.nationality}
                                helperText={errors.nationality?.message}
                            />

                            <TextField
                                fullWidth
                                label="Mother Tongue"
                                {...register("mother_tongue")}
                                error={!!errors.mother_tongue}
                                helperText={errors.mother_tongue?.message}
                            />

                            <TextField
                                fullWidth
                                label="Blood Group"
                                {...register("blood_group")}
                                error={!!errors.blood_group}
                                helperText={errors.blood_group?.message}
                            />

                            <TextField
                                fullWidth
                                label="Religion"
                                {...register("religion")}
                                error={!!errors.religion}
                                helperText={errors.religion?.message}
                            />

                            <TextField
                                fullWidth
                                label="Contact Number"
                                {...register("contact_number")}
                                error={!!errors.contact_number}
                                helperText={errors.contact_number?.message}
                            />

                            {/* class_info.* */}
                            <TextField
                                fullWidth
                                label="Class Name"
                                {...register("class_info.class_name")}
                                error={!!errors.class_info?.class_name}
                                helperText={errors.class_info?.class_name?.message}
                            />

                            <TextField
                                fullWidth
                                label="Section"
                                {...register("class_info.section")}
                                error={!!errors.class_info?.section}
                                helperText={errors.class_info?.section?.message}
                            />

                            <TextField
                                fullWidth
                                label="Academic Year"
                                {...register("class_info.academic_year")}
                                error={!!errors.class_info?.academic_year}
                                helperText={errors.class_info?.academic_year?.message}
                            />
                            {/* Face ID + Buttons */}
                            <div className="grid grid-cols-[80%_20%] gap-2 pb-3 md:pb-0 items-center">
                                {/* FACE REGISTER BUTTON */}
                                <MuiButton
                                    type="button"
                                    onClick={() => setFaceidModalOpen(true)}
                                    sx={{
                                        backgroundColor: "#6b7280",
                                        color: "white",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        gap: 1,
                                        height: 44,
                                        "&:hover": {
                                            backgroundColor: "#4b5563",
                                        },
                                    }}
                                    fullWidth
                                >
                                    <Camera size={18} />
                                    {data?.data?.descriptor?.length > 0
                                        ? "Update Face ID"
                                        : "Register Face ID"}
                                </MuiButton>

                                {/* DELETE FACE BUTTON */}
                                <MuiButton
                                    type="button"
                                    disabled={
                                        data?.data?.descriptor?.length === 0
                                    }
                                    onClick={() => deleteFaceId(selectedStudent?.user_id)}
                                    sx={{
                                        backgroundColor: "#ef4444",
                                        color: "white",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        height: 44,
                                        "&:hover": {
                                            backgroundColor: "#dc2626",
                                        },
                                    }}
                                    fullWidth
                                >
                                    <Trash2 size={18} />
                                </MuiButton>
                            </div>

                        </div>

                        <Box display="flex" justifyContent="end" gap={1}>
                            <MuiButton type="button" variant="outlined" color="error" onClick={handleClose}>
                                Cancel
                            </MuiButton>
                            <MuiButton
                                type="submit"
                                variant="contained"
                                disabled={createMutation.isPending || updateMutation.isPending}
                            >
                                {(createMutation.isPending || updateMutation.isPending) ? "Saving..." : "Submit"}
                            </MuiButton>
                        </Box>
                    </form>
                </Box>
            </Fade>
        </Modal>
    );
}