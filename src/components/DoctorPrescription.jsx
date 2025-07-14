import React, { useEffect, useState } from "react";
import {
  Box,
  Button,
  CircularProgress,
  Divider,
  Grid,
  IconButton,
  InputAdornment,
  Paper,
  TextField,
  Typography,
  Drawer,
  List,
  Stack,
  Tooltip,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import api from "../utils/api";
import { DataGrid } from "@mui/x-data-grid";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import CloseIcon from "@mui/icons-material/Close";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import MedicationOutlinedIcon from "@mui/icons-material/MedicationOutlined";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import { capitalizeWords } from "../pages/hospitalpayment/HospitalPayment";

const initialItem = {
  medication: "",
  dosage: "",
  frequency: "",
  duration: "",
  instructions: "",
};

const DoctorPrescription = () => {
  const theme = useTheme();
  const [cardNumber, setCardNumber] = useState("");
  const [cardNumberError, setCardNumberError] = useState("");
  const [patientName, setPatientName] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [prescriptionItems, setPrescriptionItems] = useState([initialItem]);
  const [prescriptionItemsError, setPrescriptionItemsError] = useState([
    initialItem,
  ]);
  const [rows, setRows] = useState([]);
  const [selectedRow, setSelectedRow] = useState(null);
  const [open, setOpen] = useState(false);

  const brandColor = "#3b8ada"; // your hospital brand color

  const sectionBgColor =
    theme.palette.mode === "dark" ? theme.palette.background.paper : "#f5f8fd"; // light background for light mode

  const handleClose = () => {
    setOpen(false);
    setSelectedRow(null);
  };

  const fetchPatientName = async () => {
    try {
      setLoading(true);

      if (
        cardNumber.length <= 0 ||
        patientName?.length > 0 ||
        !!cardNumberError
      ) {
        return;
      }
      const { data } = await api.put("/Patient/get-one-patient-info", {
        patientCardNumber: cardNumber,
      });

      const fullName = [
        data?.data?.value[0]?.patientFirstName,
        data?.data?.value[0]?.patientMiddleName,
        data?.data?.value[0]?.patientLastName,
      ]
        .filter(Boolean)
        .join(" ");

      if (fullName) {
        setPatientName(fullName);
      } else {
        toast.error("Card Number Not Registered.");
        setPatientName("");
      }
    } catch (err) {
      console.error("This is fetchPatientName Error: ", err);
      toast.error("Error fetching patient info.");
      setPatientName("");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (index, field, value) => {
    setPrescriptionItems((items) =>
      items.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
    letterOnlyCheck(index, field, value);
  };

  const letterOnlyCheck = (index, key, value) => {
    const regex = /^[A-Za-z0-9\s._]+$/;
    if (!regex.test(value) && value?.length > 0) {
      setPrescriptionItemsError((items) =>
        items.map((item, i) =>
          i === index
            ? { ...item, [key]: "Only letters, numbers and spaces allowed." }
            : item
        )
      );
    } else {
      setPrescriptionItemsError((items) =>
        items.map((item, i) => (i === index ? { ...item, [key]: "" } : item))
      );
    }
  };

  const addMedication = () => {
    setPrescriptionItems([...prescriptionItems, initialItem]);
    setPrescriptionItemsError([...prescriptionItemsError, initialItem]);
  };

  const removeMedication = (index) => {
    if (prescriptionItems.length <= 1) {
      toast.warning("At least one medication is required.");
      return;
    }
    setPrescriptionItems((items) => items.filter((_, i) => i !== index));
    setPrescriptionItemsError((items) => items.filter((_, i) => i !== index));
  };

  const groupRequestsByPatientAndDate = async (data) => {
    try {
      const result = [];

      data.forEach((entry) => {
        const fullDate = entry.createdOn;
        const cardNumber = entry.patientCardNumber;

        // Skip entry if required fields are missing
        if (!fullDate || !cardNumber || !Array.isArray(entry.requestedItems))
          return;

        // Find or create patient + date group
        let patientGroup = result.find(
          (g) => g.patientCardNumber === cardNumber && g.date === fullDate
        );

        if (!patientGroup) {
          patientGroup = {
            patientCardNumber: cardNumber,
            date: fullDate,
            patientInfo: {
              patientFirstName: entry.patientFirstName,
              patientMiddleName: entry.patientMiddleName,
              patientLastName: entry.patientLastName,
              patientGender: entry.patientGender,
            },
            services: [],
          };
          result.push(patientGroup);
        }

        // Process each requested item
        entry.requestedItems.forEach((item) => {
          const serviceName = item.requestedServices?.trim().toLowerCase();
          if (!serviceName) return;

          const existingService = patientGroup.services.find(
            (s) => s.requestedServices.trim().toLowerCase() === serviceName
          );

          if (existingService) {
            existingService.details.push(item);
            const count = parseInt(item.procedeureCount) || 0;
            existingService.totalCount += count;
          } else {
            patientGroup.services.push({
              requestedServices: item.requestedServices,
              totalCount: parseInt(item.procedeureCount) || 0,
              details: [item],
            });
          }
        });
      });

      // Sort by most recent createdOn
      result.sort((a, b) => new Date(b.date) - new Date(a.date));

      return result;
    } catch (error) {
      console.error("Error during grouping:", error);
      return []; // return safe fallback
    }
  };

  const fetchData = async () => {
    try {
      const response = await api.get("/Request/doctor/get-request/Pharmacy");
      const value = response?.data?.data?.value || [];

      const sorted = await groupRequestsByPatientAndDate(value);

      const formatted = sorted.map((item, index) => ({
        id: index + 1,
        cardNumber: item.patientCardNumber,
        date: item.date,
        patientName: [
          item.patientInfo?.patientFirstName,
          item.patientInfo?.patientMiddleName,
          item.patientInfo?.patientLastName,
        ]
          .filter(Boolean)
          .join(" "),
        gender: item.patientInfo?.patientGender,
        services: item.services,
      }));

      setRows(formatted);
    } catch (error) {
      console.error("Error fetching pharmacy requests:", error);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async () => {
    try {
      setIsSending(true);
      if (!cardNumber) return toast.warning("Enter and verify card number.");
      if (prescriptionItems.some((item) => !item.medication))
        return toast.warning("Medication name is required.");

      const errorCheck = prescriptionItemsError?.some((item) =>
        Object.values(item || {}).some((each) => each?.length > 0)
      );
      if (errorCheck) {
        toast.error("Please fix the error.");
        return;
      }
      const payload = {
        patientCardnumber: cardNumber,
        reqestedTo: "pharmacy",
        requestItems: prescriptionItems.map((item) => ({
          prodedures: item.medication,
          prodeduresCount: item.frequency,
          measurment: item.dosage,
          duration: item.duration,
          instruction: item.instructions,
        })),
      };

      const response = await api.post("/Request/doctor/order-request", payload);

      if (response?.status === 200 || response?.status === 201) {
        toast.success(`Prescription sent successfully`);
        fetchData();
        setPatientName("");
        setCardNumber("");
        setPrescriptionItems([initialItem]);
        setPrescriptionItemsError([initialItem]);
      }
    } catch (err) {
      console.error("API errors:", err);
      toast.error(err?.response?.data?.errorDescription);
    } finally {
      setIsSending(false);
    }
  };

  const mrnCheck = (value) => {
    const valid = /^[0-9]{5,}$/.test(value);
    if (!valid && value?.length > 0) {
      setCardNumberError("Please enter valid MRN (5+ digits).");
    } else {
      setCardNumberError("");
    }
  };

  /*const columns = [
    { field: "cardNumber", headerName: "Card Number", flex: 1.5 },
    { field: "patientName", headerName: "Patient Name", flex: 2.5 },
    { field: "medication", headerName: "Medication", flex: 2.5 },
    { field: "frequency", headerName: "Frequency", flex: 1 },
    { field: "dosage", headerName: "Dosage", flex: 1 },
    { field: "duration", headerName: "Duration", flex: 1.5 },
    { field: "instructions", headerName: "Instructions", flex: 2.5 },
  ];
  */
  const handleRowDoubleClick = (params) => {
    setSelectedRow(params.row);
    setOpen(true);
  };

  const columns = [
    { field: "cardNumber", headerName: "Card Number", flex: 1 },
    { field: "patientName", headerName: "Patient Name", flex: 1 },
    { field: "gender", headerName: "Gender", flex: 0.8 },
    { field: "date", headerName: "Date Requested", flex: 1.2 },
  ];

  const handleCancelBtn = () => {
    setPatientName("");
    setCardNumber("");
    setCardNumberError("");
    setPrescriptionItems([initialItem]);
    setPrescriptionItemsError([initialItem]);
  };

  return (
    <Box
      sx={{
        // minHeight: '100vh',
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        p: 2,
        background:
          theme.palette.mode === "dark"
            ? `linear-gradient(135deg, rgba(46, 138, 201, 0.1))`
            : `linear-gradient(135deg, ${theme.palette.grey[100]}, ${theme.palette.grey[300]})`,
        marginInline: "10px",
      }}
    >
      <Paper
        elevation={6}
        sx={{
          // maxWidth: 850,
          width: "100%",
          p: 4,
          borderRadius: 3,
          backgroundColor: theme.palette.background.paper,
        }}
      >
        <Typography
          variant="h4"
          align="center"
          fontWeight={700}
          sx={{ mb: 4, color: theme.palette.mode === "dark" ? "#fff" : "#000" }}
        >
          Electronic Prescription
        </Typography>

        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <TextField
              label="Patient Card Number"
              value={cardNumber}
              onChange={(e) => {
                setCardNumber(e.target.value);
                setPatientName("");
                mrnCheck(e.target.value);
              }}
              onBlur={fetchPatientName}
              fullWidth
              error={!!cardNumberError}
              helperText={cardNumberError}
              InputProps={{
                endAdornment: loading && (
                  <InputAdornment position="end">
                    <CircularProgress size={24} color="inherit" />
                  </InputAdornment>
                ),
                sx: {
                  "& .MuiOutlinedInput-notchedOutline": {
                    borderColor:
                      theme.palette.mode === "dark" ? "#fff" : "#000",
                  },
                  "&:hover .MuiOutlinedInput-notchedOutline": {
                    borderColor:
                      theme.palette.mode === "dark" ? "#fff" : "#000",
                  },
                  "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                    borderColor:
                      theme.palette.mode === "dark" ? "#fff" : "#000",
                  },
                  color: theme.palette.mode === "dark" ? "#fff" : "#000",
                },
              }}
              InputLabelProps={{
                sx: {
                  color: theme.palette.mode === "dark" ? "#ccc" : "#555",
                  "&.Mui-focused": {
                    color: theme.palette.mode === "dark" ? "#fff" : "#000",
                  },
                },
              }}
              sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              label="Patient Name"
              value={patientName}
              fullWidth
              disabled
              sx={{
                "& .MuiOutlinedInput-root": {
                  borderRadius: 2,
                  backgroundColor: theme.palette.action.disabledBackground,
                },
              }}
            />
          </Grid>
        </Grid>

        <Divider
          sx={{ my: 4, color: theme.palette.mode === "dark" ? "#fff" : "#000" }}
        />

        <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
          Prescription Medications
        </Typography>

        {prescriptionItems.map((item, index) => (
          <Box
            key={index}
            sx={{
              mb: 3,
              p: 2,
              border: `1px solid ${theme.palette.divider}`,
              borderRadius: 2,
              backgroundColor: theme.palette.background.default,
            }}
          >
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  label="Medication"
                  value={item.medication}
                  onChange={(e) =>
                    handleChange(index, "medication", e.target.value)
                  }
                  error={!!prescriptionItemsError[index]?.medication}
                  helperText={prescriptionItemsError[index]?.medication}
                  fullWidth
                  InputProps={{
                    sx: {
                      "& .MuiOutlinedInput-notchedOutline": {
                        borderColor:
                          theme.palette.mode === "dark" ? "#fff" : "#000",
                      },
                      "&:hover .MuiOutlinedInput-notchedOutline": {
                        borderColor:
                          theme.palette.mode === "dark" ? "#fff" : "#000",
                      },
                      "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                        borderColor:
                          theme.palette.mode === "dark" ? "#fff" : "#000",
                      },
                      color: theme.palette.mode === "dark" ? "#fff" : "#000",
                    },
                  }}
                  InputLabelProps={{
                    sx: {
                      color: theme.palette.mode === "dark" ? "#ccc" : "#555",
                      "&.Mui-focused": {
                        color: theme.palette.mode === "dark" ? "#fff" : "#000",
                      },
                    },
                  }}
                  sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={2}>
                <TextField
                  label="Dosage"
                  value={item.dosage}
                  onChange={(e) =>
                    handleChange(index, "dosage", e.target.value)
                  }
                  fullWidth
                  error={!!prescriptionItemsError[index]?.dosage}
                  helperText={prescriptionItemsError[index]?.dosage}
                  InputProps={{
                    sx: {
                      "& .MuiOutlinedInput-notchedOutline": {
                        borderColor:
                          theme.palette.mode === "dark" ? "#fff" : "#000",
                      },
                      "&:hover .MuiOutlinedInput-notchedOutline": {
                        borderColor:
                          theme.palette.mode === "dark" ? "#fff" : "#000",
                      },
                      "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                        borderColor:
                          theme.palette.mode === "dark" ? "#fff" : "#000",
                      },
                      color: theme.palette.mode === "dark" ? "#fff" : "#000",
                    },
                  }}
                  InputLabelProps={{
                    sx: {
                      color: theme.palette.mode === "dark" ? "#ccc" : "#555",
                      "&.Mui-focused": {
                        color: theme.palette.mode === "dark" ? "#fff" : "#000",
                      },
                    },
                  }}
                  sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={2}>
                <TextField
                  label="Frequency"
                  value={item.frequency}
                  onChange={(e) =>
                    handleChange(index, "frequency", e.target.value)
                  }
                  fullWidth
                  error={!!prescriptionItemsError[index]?.frequency}
                  helperText={prescriptionItemsError[index]?.frequency}
                  InputProps={{
                    sx: {
                      "& .MuiOutlinedInput-notchedOutline": {
                        borderColor:
                          theme.palette.mode === "dark" ? "#fff" : "#000",
                      },
                      "&:hover .MuiOutlinedInput-notchedOutline": {
                        borderColor:
                          theme.palette.mode === "dark" ? "#fff" : "#000",
                      },
                      "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                        borderColor:
                          theme.palette.mode === "dark" ? "#fff" : "#000",
                      },
                      color: theme.palette.mode === "dark" ? "#fff" : "#000",
                    },
                  }}
                  InputLabelProps={{
                    sx: {
                      color: theme.palette.mode === "dark" ? "#ccc" : "#555",
                      "&.Mui-focused": {
                        color: theme.palette.mode === "dark" ? "#fff" : "#000",
                      },
                    },
                  }}
                  sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={2}>
                <TextField
                  label="Duration"
                  value={item.duration}
                  onChange={(e) =>
                    handleChange(index, "duration", e.target.value)
                  }
                  fullWidth
                  error={!!prescriptionItemsError[index]?.duration}
                  helperText={prescriptionItemsError[index]?.duration}
                  InputProps={{
                    sx: {
                      "& .MuiOutlinedInput-notchedOutline": {
                        borderColor:
                          theme.palette.mode === "dark" ? "#fff" : "#000",
                      },
                      "&:hover .MuiOutlinedInput-notchedOutline": {
                        borderColor:
                          theme.palette.mode === "dark" ? "#fff" : "#000",
                      },
                      "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                        borderColor:
                          theme.palette.mode === "dark" ? "#fff" : "#000",
                      },
                      color: theme.palette.mode === "dark" ? "#fff" : "#000",
                    },
                  }}
                  InputLabelProps={{
                    sx: {
                      color: theme.palette.mode === "dark" ? "#ccc" : "#555",
                      "&.Mui-focused": {
                        color: theme.palette.mode === "dark" ? "#fff" : "#000",
                      },
                    },
                  }}
                  sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
                />
              </Grid>

              <Grid item xs={12} md={3}>
                <Box sx={{ display: "flex", alignItems: "center" }}>
                  <TextField
                    label="Instructions"
                    value={item.instructions}
                    onChange={(e) =>
                      handleChange(index, "instructions", e.target.value)
                    }
                    fullWidth
                    error={!!prescriptionItemsError[index]?.instructions}
                    helperText={prescriptionItemsError[index]?.instructions}
                    InputProps={{
                      sx: {
                        "& .MuiOutlinedInput-notchedOutline": {
                          borderColor:
                            theme.palette.mode === "dark" ? "#fff" : "#000",
                        },
                        "&:hover .MuiOutlinedInput-notchedOutline": {
                          borderColor:
                            theme.palette.mode === "dark" ? "#fff" : "#000",
                        },
                        "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                          borderColor:
                            theme.palette.mode === "dark" ? "#fff" : "#000",
                        },
                        color: theme.palette.mode === "dark" ? "#fff" : "#000",
                      },
                    }}
                    InputLabelProps={{
                      sx: {
                        color: theme.palette.mode === "dark" ? "#ccc" : "#555",
                        "&.Mui-focused": {
                          color:
                            theme.palette.mode === "dark" ? "#fff" : "#000",
                        },
                      },
                    }}
                    sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
                  />
                  {prescriptionItems.length > 1 && (
                    <IconButton
                      onClick={() => removeMedication(index)}
                      color="error"
                      sx={{ ml: 1 }}
                    >
                      <DeleteIcon />
                    </IconButton>
                  )}
                </Box>
              </Grid>
            </Grid>
          </Box>
        ))}

        <Button
          onClick={addMedication}
          startIcon={<AddIcon />}
          variant="outlined"
          sx={(theme) => ({
            mb: 4,
            borderRadius: 2,
            textTransform: "none",
            borderColor:
              theme.palette.mode === "dark"
                ? "#fff"
                : theme.palette.primary.main,
            color:
              theme.palette.mode === "dark"
                ? "#fff"
                : theme.palette.primary.main,
            "&:hover": {
              backgroundColor:
                theme.palette.mode === "dark"
                  ? "rgba(255, 255, 255, 0.08)"
                  : theme.palette.action.hover,
              borderColor:
                theme.palette.mode === "dark"
                  ? "#fff"
                  : theme.palette.primary.dark,
            },
          })}
        >
          Add Another Medication
        </Button>

        <Box
          sx={{
            textAlign: "right",
            display: "flex",
            gap: 2,
            justifyContent: "flex-end",
            flexWrap: "wrap",
          }}
        >
          <Button
            onClick={() => handleCancelBtn()}
            variant="contained"
            size="large"
            disabled={
              !cardNumber &&
              prescriptionItems.every(
                (i) =>
                  !i.medication &&
                  !i.dosage &&
                  !i.frequency &&
                  !i.duration &&
                  !i.instructions
              )
            }
            sx={{
              borderRadius: 3,
              px: 4,
              py: 1.6,
              fontWeight: 600,
              textTransform: "none",
              backgroundColor: "error.main",
              color: "#fff",
              boxShadow: `0 4px 12px rgba(0, 0, 0, 0.15)`,
              transition: "all 0.3s ease",
              "&:hover": {
                backgroundColor: "error.dark",
                boxShadow: `0 6px 16px rgba(0, 0, 0, 0.2)`,
              },
              "&:disabled": {
                backgroundColor: (theme) =>
                  theme.palette.action.disabledBackground,
                color: (theme) => theme.palette.action.disabled,
              },
            }}
          >
            Clear
          </Button>

          <Button
            onClick={() => handleSubmit()}
            variant="contained"
            size="large"
            disabled={
              !cardNumber ||
              prescriptionItems.some((i) => !i.medication) ||
              isSending
            }
            sx={(theme) => ({
              borderRadius: 3,
              px: 4,
              py: 1.6,
              fontWeight: 600,
              gap: 3,
              textTransform: "none",
              background:
                theme.palette.mode === "dark"
                  ? "#ffffff" // White in dark mode
                  : "#000000",
              color: theme.palette.mode === "dark" ? "#000000" : "#ffffff", // black text in dark mode for contrast
              boxShadow: `0 4px 12px rgba(0, 0, 0, 0.15)`,
              transition: "all 0.3s ease",
              "&:hover": {
                background:
                  theme.palette.mode === "dark"
                    ? "#f0f0f0"
                    : `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
                boxShadow: `0 6px 16px rgba(0, 0, 0, 0.2)`,
              },
              "&:disabled": {
                backgroundColor: theme.palette.action.disabledBackground,
                color: theme.palette.action.disabled,
              },
            })}
          >
            {isSending ? (
              <CircularProgress size={24} color="inherit" />
            ) : (
              "Send to Pharmacy"
            )}
          </Button>
        </Box>
      </Paper>

      <Paper
        elevation={4}
        sx={{
          width: "100%",
          // maxWidth: 680,
          p: { xs: 2, sm: 3 }, // Slightly less padding for the data grid paper
          borderRadius: 3,
          backgroundColor: theme.palette.background.paper,
          boxShadow: `0px 5px 15px rgba(0, 0, 0, 0.1)`,
          mt: 4, // Margin top to separate from the form
        }}
      >
        <Typography
          variant="h6"
          fontWeight={600}
          sx={{ mb: 2, color: theme.palette.text.primary }}
        >
          Recently Sent Tests
        </Typography>
        <Box sx={{ height: 300, width: "100%" }}>
          <DataGrid
            rows={rows}
            columns={columns}
            density="comfortable" // More compact row spacing
            sx={{
              "& .MuiDataGrid-columnHeaders": {
                backgroundColor: theme.palette.primary.light + "15", // Light background for headers
                fontWeight: "bold",
              },
              "& .MuiDataGrid-cell": {
                borderBottom: `1px dotted ${theme.palette.divider}`, // Dotted line between cells
              },
              border: "none", // Remove default DataGrid border
            }}
            onRowDoubleClick={handleRowDoubleClick}
          />
        </Box>
        <Drawer anchor="right" open={open} onClose={handleClose}>
          <Box
            sx={{
              width: { xs: "100vw", sm: 480 },
              height: "100%",
              display: "flex",
              flexDirection: "column",
              bgcolor: theme.palette.background.default,
              color: theme.palette.text.primary,
              px: 3,
              pt: 2,
              pb: 3,
              fontFamily: "Roboto, 'Segoe UI', sans-serif",
            }}
          >
            {/* Header */}
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                mb: 2,
              }}
            >
              <Stack direction="row" spacing={1} alignItems="center">
                <InfoOutlinedIcon sx={{ color: "#6870fa" }} fontSize="medium" />
                <Typography
                  variant="h6"
                  fontWeight={600}
                  sx={{ color: "#6870fa" }}
                >
                  Request Details
                </Typography>
              </Stack>
              <Tooltip title="Close">
                <IconButton onClick={handleClose} size="small">
                  <CloseIcon />
                </IconButton>
              </Tooltip>
            </Box>

            <Divider sx={{ mb: 2 }} />

            <Box sx={{ flexGrow: 1, overflowY: "auto", pr: 1 }}>
              {selectedRow && (
                <>
                  {/* Patient Information */}
                  <Paper
                    elevation={3}
                    sx={{
                      p: 2,
                      mb: 3,
                      borderRadius: 3,
                      bgcolor: sectionBgColor,
                    }}
                  >
                    <Stack
                      direction="row"
                      spacing={1}
                      alignItems="center"
                      mb={1}
                    >
                      <PersonOutlineIcon
                        sx={{ color: theme.palette.secondary.main }}
                        fontSize="small"
                      />
                      <Typography
                        variant="subtitle1"
                        fontWeight={600}
                        sx={{ color: brandColor }}
                      >
                        Patient Information
                      </Typography>
                    </Stack>
                    <Typography
                      variant="body1"
                      sx={{
                        mb: 0.5,
                        color:
                          theme.palette.mode === "dark" ? "#adadad" : "#333",
                      }}
                    >
                      <strong>Name:</strong> {selectedRow.patientName}
                    </Typography>
                    <Typography
                      variant="body1"
                      sx={{
                        mb: 0.5,
                        color:
                          theme.palette.mode === "dark" ? "#adadad" : "#333",
                      }}
                    >
                      <strong>Card Number:</strong> {selectedRow.cardNumber}
                    </Typography>
                    <Typography
                      variant="body1"
                      sx={{
                        mb: 0.5,
                        color:
                          theme.palette.mode === "dark" ? "#adadad" : "#333",
                      }}
                    >
                      <strong>Gender:</strong> {selectedRow.gender}
                    </Typography>
                    <Typography
                      variant="body1"
                      sx={{
                        color:
                          theme.palette.mode === "dark" ? "#adadad" : "#333",
                      }}
                    >
                      <strong>Date:</strong> {selectedRow.date}
                    </Typography>
                  </Paper>

                  {/* Medications Section */}
                  <Stack direction="row" alignItems="center" spacing={1} mb={1}>
                    <MedicationOutlinedIcon sx={{ color: "#6870fa" }} />
                    <Typography
                      variant="h6"
                      fontWeight={600}
                      sx={{ color: "#6870fa" }}
                    >
                      Requested Medications
                    </Typography>
                  </Stack>

                  <List disablePadding>
                    {selectedRow.services.map((service, idx) => (
                      <Paper
                        key={idx}
                        elevation={2}
                        sx={{
                          p: 2,
                          mb: 2,
                          borderLeft: `6px solid ${
                            theme.palette.mode === "light"
                              ? "#333333cf"
                              : brandColor
                          }`,
                          borderRadius: 2,
                          bgcolor: sectionBgColor,
                        }}
                      >
                        <Typography
                          variant="subtitle1"
                          fontWeight={600}
                          sx={{
                            color:
                              theme.palette.mode === "light"
                                ? "#7c7c7cf5"
                                : "#4cceac",
                            mb: 1,
                          }}
                        >
                          {capitalizeWords(service.requestedServices)}
                        </Typography>
                        {service.details.map((detail, i) => (
                          <Box key={i} sx={{ ml: 1.5, mt: 1 }}>
                            <Typography
                              variant="body2"
                              color={
                                theme.palette.mode === "dark"
                                  ? "#adadad"
                                  : "#333"
                              }
                            >
                              <strong>Count:</strong> {detail.procedeureCount}
                            </Typography>
                            <Typography
                              variant="body2"
                              color={
                                theme.palette.mode === "dark"
                                  ? "#adadad"
                                  : "#333"
                              }
                            >
                              <strong>Dosage:</strong> {detail.measurement}
                            </Typography>
                            <Typography
                              variant="body2"
                              color={
                                theme.palette.mode === "dark"
                                  ? "#adadad"
                                  : "#333"
                              }
                            >
                              <strong>Duration:</strong> {detail.duration}
                            </Typography>
                            <Typography
                              variant="body2"
                              color={
                                theme.palette.mode === "dark"
                                  ? "#adadad"
                                  : "#333"
                              }
                            >
                              <strong>Instructions:</strong>{" "}
                              {detail.instruction}
                            </Typography>
                          </Box>
                        ))}
                      </Paper>
                    ))}
                  </List>
                </>
              )}
            </Box>
          </Box>
        </Drawer>
      </Paper>
      <ToastContainer />
    </Box>
  );
};

export default DoctorPrescription;
