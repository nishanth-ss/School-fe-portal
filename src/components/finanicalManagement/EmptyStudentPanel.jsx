import { Box, Typography } from "@mui/material";

export const EmptyStudentPanel = () => {
  return (
    <Box className="bg-white rounded-2xl border border-dashed border-gray-300 p-6">
      <Typography variant="h6" className="font-bold text-gray-800">
        Student Details
      </Typography>
      <Typography variant="body2" className="text-gray-500 mt-2">
        Search by Student ID to view student profile and details here.
      </Typography>
    </Box>
  );
};
