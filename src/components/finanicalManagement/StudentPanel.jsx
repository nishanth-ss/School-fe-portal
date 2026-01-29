import { Avatar, Box, Divider, Typography } from "@mui/material";

export const StudentPanel = ({ student }) => {
    const classInfo = student?.class_info;

    // If backend gives only file name, build full URL here
    // If student.pro_pic is already a full URL, keep it.
    const profileSrc = (() => {
        const pic = student?.pro_pic?.file_url;

        if (!pic) return "";

        // if backend sends full url
        if (typeof pic === "string" && pic.startsWith("http")) {
            return pic;
        }

        // if backend sends relative path
        if (typeof pic === "string") {
            return `${import.meta.env.VITE_API_URL}${pic}`;
        }

        // anything else (object/null)
        return "";
    })();


    return (
        <Box className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
            <div className="flex items-center gap-4">
                <Avatar
                    src={profileSrc || undefined}
                    alt={student?.student_name}
                    sx={{ width: 64, height: 64 }}
                >
                    {(student?.student_name?.[0] || "S").toUpperCase()}
                </Avatar>

                <div className="min-w-0">
                    <Typography variant="h6" className="font-bold truncate">
                        {student?.student_name || "-"}
                    </Typography>

                    <Typography variant="body2" className="text-gray-600">
                        ID: <span className="font-semibold">{student?.registration_number || "-"}</span>
                    </Typography>

                    <Typography variant="body2" className="text-gray-600">
                        Class:{" "}
                        <span className="font-semibold">
                            {classInfo?.class_name || "-"} {classInfo?.section ? `(${classInfo.section})` : ""}
                        </span>
                        {classInfo?.academic_year ? (
                            <span className="ml-2 text-gray-500">AY {classInfo.academic_year}</span>
                        ) : null}
                    </Typography>
                </div>
            </div>

            <Divider className="my-4" />

            {/* Info grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                <InfoItem label="Father Name" value={student?.father_name} />
                <InfoItem label="Mother Name" value={student?.mother_name} />
                <InfoItem label="Gender" value={student?.gender} />
                <InfoItem
                    label="DOB"
                    value={student?.date_of_birth ? formatDate(student.date_of_birth) : ""}
                />
                <InfoItem label="Blood Group" value={student?.blood_group} />
                <InfoItem label="Birth Place" value={student?.birth_place} />
                <InfoItem label="Mother Tongue" value={student?.mother_tongue} />
                <InfoItem label="Nationality" value={student?.nationality} />
                <InfoItem label="Religion" value={student?.religion} />
                <InfoItem label="Contact No." value={student?.contact_number} />
                <InfoItem label="Deposit Amount" value={student?.deposite_amount?.toString()} />
                {/* <InfoItem label="Subscription" value={student?.subscription ? "Yes" : "No"} /> */}
            </div>
        </Box>
    );
};

const InfoItem = ({ label, value }) => (
    <div className="bg-gray-50 rounded-xl px-3 p-1 flex flex-row md:flex-col items-center md:items-start gap-3 md:gap-1">
        <Typography variant="caption" className="text-gray-500">
            {label}
        </Typography>
        <Typography variant="body2" className="font-semibold text-gray-900">
            {value || "-"}
        </Typography>
    </div>
);

const formatDate = (iso) => {
    try {
        const d = new Date(iso);
        return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
    } catch {
        return "-";
    }
};
