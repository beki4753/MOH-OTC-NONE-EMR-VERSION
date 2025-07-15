import React from "react";
import { Box, Typography, Button } from "@mui/material";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import { keyframes } from "@emotion/react";

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
`;

const pulse = keyframes`
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
`;

const shake = keyframes`
  0% { transform: translateX(0); }
  25% { transform: translateX(-5px); }
  50% { transform: translateX(5px); }
  75% { transform: translateX(-5px); }
  100% { transform: translateX(0); }
`;

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    // Optionally log to external service
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <Box
          sx={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            textAlign: "center",
            px: 3,
            background: "linear-gradient(135deg, #fceabb, #f8b500)",
            animation: `${fadeIn} 1s ease forwards`,
            color: "#6b0f00",
            fontFamily: `'Segoe UI', Tahoma, Geneva, Verdana, sans-serif`,
            gap: 3,
          }}
        >
          <ErrorOutlineIcon
            color="error"
            sx={{
              fontSize: 100,
              animation: `${shake} 0.8s ease-in-out infinite`,
              mb: 2,
            }}
          />
          <Typography
            variant="h3"
            color="error"
            sx={{
              fontWeight: "bold",
              animation: `${pulse} 2s infinite ease-in-out`,
            }}
            gutterBottom
          >
            Oops! Something went wrong.
          </Typography>
          <Typography
            variant="body1"
            sx={{
              maxWidth: 400,
              fontWeight: 600,
              fontStyle: "italic",
              mb: 3,
            }}
          >
            {this.state.error?.message || "An unexpected error occurred."}
          </Typography>
          <Button
            variant="contained"
            color="error"
            onClick={this.handleReload}
            sx={{
              px: 4,
              py: 1.5,
              fontSize: "1.1rem",
              fontWeight: "bold",
              boxShadow: "0 4px 15px 0 rgba(248, 181, 0, 0.75)", // subtle golden shadow
              transition: "transform 0.3s ease",
              "&:hover": {
                transform: "scale(1.05)",
                boxShadow: "0 6px 20px 0 rgba(248, 181, 0, 1)", // stronger on hover
              },
            }}
          >
            Reload Page
          </Button>
        </Box>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
