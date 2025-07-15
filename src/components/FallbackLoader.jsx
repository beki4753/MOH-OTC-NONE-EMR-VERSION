import React from "react";
import { Box, CircularProgress, Typography, useTheme } from "@mui/material";

const FallbackLoader = () => {
  const theme = useTheme();

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        flexDirection: "column",
        bgcolor: theme.palette.background.default,
        color: theme.palette.text.primary,
      }}
    >
      <CircularProgress
        size={40}
        thickness={4}
        sx={{ color: theme.palette.primary.main, mb: 2 }}
      />
      <Typography variant="h6">Loading, please wait...</Typography>
    </Box>
  );
};

export default FallbackLoader;
