import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";

import { useForm } from "react-hook-form";
import { useSnackbar } from "notistack";
import { useLocationMutation } from "../../hooks/useLocationMutation";
import { useEffect } from "react";

export default function LocationDialog({ open,
    onClose,
    isEdit = false,
    selectedLocation = null, }) {

    const { enqueueSnackbar } = useSnackbar();
    const locationMutation = useLocationMutation();

    const {
        register,
        handleSubmit,
        formState: { errors },
        reset,
    } = useForm({
        defaultValues: {
            schoolName: "",
            baseUrl: "",
            locationName: "",
        },
    });

    useEffect(() => {
        if (!open) return;

        if (isEdit && selectedLocation) {
            reset({
                schoolName: selectedLocation.schoolName || "",
                baseUrl: selectedLocation.baseUrl || "",
                locationName: selectedLocation.locationName || "",
            });
        } else {
            reset({
                schoolName: "",
                baseUrl: "",
                locationName: "",
            });
        }
    }, [open, isEdit, selectedLocation, reset]);

    const onSubmit = (values) => {
        locationMutation.mutate(
            {
                isEdit,
                selectedLocation,
                payload: values,
            },
            {
                onSuccess: (data) => {
                    enqueueSnackbar(
                        isEdit ? "Location updated" : "Location created",
                        { variant: "success" }
                    );
                    onClose();
                },
                onError: (err) => {
                    console.log(err);
                    
                    enqueueSnackbar(
                        err?.response?.data?.message ||
                        "Something went wrong",
                        { variant: "error" }
                    );
                },
            }
        );
    };

    const handleClose = () => {
        onClose();
        reset(); // optional
    };

    return (
        <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
            <DialogTitle>Select Location</DialogTitle>

            <form onSubmit={handleSubmit(onSubmit)}>
                <DialogContent className="flex flex-col gap-4">
                    <TextField
                        label="School Name"
                        fullWidth
                        size="small"
                        {...register("schoolName", { required: "School name is required" })}
                        error={!!errors.schoolName}
                        helperText={errors.schoolName?.message}
                    />

                    <TextField
                        label="Base URL"
                        fullWidth
                        size="small"
                        placeholder="https://example.com"
                        {...register("baseUrl", {
                            required: "Base URL is required",
                            pattern: {
                                value: /^https?:\/\/.+/i,
                                message: "Enter a valid URL starting with http/https",
                            },
                        })}
                        error={!!errors.baseUrl}
                        helperText={errors.baseUrl?.message}
                    />

                    <TextField
                        label="Location Name"
                        fullWidth
                        size="small"
                        {...register("locationName", {
                            required: "Location name is required",
                        })}
                        error={!!errors.locationName}
                        helperText={errors.locationName?.message}
                    />
                </DialogContent>

                <DialogActions>
                    <Button onClick={handleClose} color="inherit">
                        Cancel
                    </Button>
                    <Button type="submit" variant="contained" className="bg-primary!">
                        Save
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    );
}
