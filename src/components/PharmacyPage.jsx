import React, { useState, useEffect } from "react";
import {
  Box,
  Button,
  CircularProgress,
  Divider,
  Typography,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Grid,
  Paper,
  TextField,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
  Avatar,
  Badge,
  Checkbox,
  FormControlLabel,
  TableHead,
} from "@mui/material";
import { GridFooterContainer, GridFooter } from "@mui/x-data-grid";
import { useTheme } from "@mui/material/styles";
import { Refresh } from "@mui/icons-material";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {
  LocalPharmacy,
  CheckCircleOutline,
  ExpandMore,
  Person,
  CalendarToday,
  MedicalInformation,
  Payment,
  Paid,
} from "@mui/icons-material";

import api from "../utils/api";
import { formatAccounting2 } from "../pages/hospitalpayment/HospitalPayment";
import { ClipboardList } from "lucide-react";
import DoneIcon from "@mui/icons-material/Done";
import HourglassEmptyIcon from "@mui/icons-material/HourglassEmpty";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import { alpha } from "@mui/material/styles";
import MyDataGrid from "./MyDataGrid";

const STATUS_COLORS = {
  ORDERED: "warning",
  PAID: "success",
  "Waiting For Payment": "info",
};

const STATUS_ICONS = {
  PAID: <DoneIcon fontSize="small" />,
  ORDERED: <HourglassEmptyIcon fontSize="small" />,
  "Waiting For Payment": <ErrorOutlineIcon fontSize="small" />,
};

const Pharmacy = () => {
  const theme = useTheme();
  const [groupedRequests, setGroupedRequests] = useState({});
  const [filteredRequests, setFilteredRequests] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedGroupKey, setSelectedGroupKey] = useState(null);
  const [isSending, setIsSending] = useState(false);
  const [refresh, setRefresh] = useState(false);

  // Define checkbox color based on theme mode
  const checkboxColor =
    theme.palette.mode === "light"
      ? theme.palette.primary.main
      : theme.palette.secondary.main;

  const handleCheckboxChange = (event, index) => {
    try {
      setGroupedRequests((prev) => {
        const updated = { ...prev };
        const items = [...updated[selectedGroupKey].items];

        const isSelected = event.target.checked;

        items[index] = {
          ...items[index],
          isSelected,
          price: isSelected ? items[index].price : 0, // keep price if selected, else zero
        };

        updated[selectedGroupKey] = { ...updated[selectedGroupKey], items };
        return updated;
      });
    } catch (error) {
      console.error("This is handleCheckboxChange Error : ", error);
    }
  };

  const resetGroupData = () => {
    try {
      const checkWaiting =
        Object.values(groupedRequests || {})?.length > 0 &&
        groupedRequests[selectedGroupKey] !== undefined
          ? groupedRequests[selectedGroupKey]?.items?.some(
              (element) =>
                element.requestedStatusId === 5 ||
                element.requestedStatusId === 1
            )
          : false;

      if (!checkWaiting) {
        setGroupedRequests((prev) => {
          if (!selectedGroupKey || !prev[selectedGroupKey]) return prev;

          const updated = { ...prev };

          const resetItems = updated[selectedGroupKey].items.map((item) => ({
            ...item,
            isSelected: true,
            price: 0,
          }));

          updated[selectedGroupKey] = {
            ...updated[selectedGroupKey],
            items: resetItems,
          };

          return updated;
        });
      }

      closeDialog();
    } catch (error) {
      console.error("This is resetGroupData Error : ", error);
    }
  };

  const handleAmountChange = (event, index) => {
    try {
      const rawValue = event.target.value;

      // Allow empty string for typing, fallback to 0 if non-number
      const value = rawValue === "" ? "" : Math.max(0, Number(rawValue));

      setGroupedRequests((prev) => {
        const updated = { ...prev };

        const selectedGroup = updated[selectedGroupKey];
        if (!selectedGroup) return prev;

        const itemsCopy = [...selectedGroup.items];

        // Only update price if the item is selected
        if (itemsCopy[index]?.isSelected) {
          itemsCopy[index] = {
            ...itemsCopy[index],
            price: value,
          };
        }

        updated[selectedGroupKey] = {
          ...selectedGroup,
          items: itemsCopy,
        };

        return updated;
      });
    } catch (error) {
      console.error("This is handleAmountChange Error : ", error);
    }
  };

  const group = groupedRequests[selectedGroupKey];

  const totalSelectedPrice =
    group?.items?.length > 0
      ? group.items
          .filter((item) => item?.isSelected)
          .reduce((acc, curr) => {
            const price = Number(curr.price);
            return acc + (isNaN(price) ? 0 : price);
          }, 0)
      : 0;

  const columns = [
    {
      field: "medication",
      headerName: "Medication",
      flex: 1.2,
      headerClassName: "header",
    },
    {
      field: "dosage",
      headerName: "Dosage",
      flex: 1,
      headerClassName: "header",
    },
    {
      field: "frequency",
      headerName: "Frequency",
      flex: 1,
      headerClassName: "header",
    },
    {
      field: "duration",
      headerName: "Duration",
      flex: 1,
      headerClassName: "header",
    },
    {
      field: "instructions",
      headerName: "Instructions",
      flex: 2,
      headerClassName: "header",
    },
    {
      field: "price",
      headerName: "Price (ETB)",
      type: "number",
      flex: 1,
      headerAlign: "right",
      align: "right",
      valueFormatter: ({ value }) => value?.toFixed(2),
      headerClassName: "header",
    },
  ];

  // Fetch and process prescription data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await api.get("/Request/doctor/get-request-pharma");
        const value = response?.data?.data?.value || [];
        const grouped = {};

        value.forEach((entry) => {
          const dateTime = new Date(entry.createdOn);
          const patientKey = `${entry.patientCardNumber}-${dateTime.getTime()}`;
          const fullName = [
            entry.patientFirstName,
            entry.patientMiddleName,
            entry.patientLastName,
          ]
            .filter(Boolean)
            .join(" ");

          const requestedItems = entry.requestedItems?.filter((item) =>
            [1, 0, 5].includes(item?.requestedStatusId)
          );
          const isPaied = requestedItems?.every(
            (item) => item?.requestedStatusId === 1
          );

          const isWaiting = requestedItems?.every(
            (item) => item?.requestedStatusId === 5
          );

          if (!grouped[patientKey]) {
            grouped[patientKey] = {
              id: patientKey,
              dateTime,
              patientName: fullName,
              cardNumber: entry.patientCardNumber,
              doctor: entry.requestedBy,
              department: entry.requestingDepartment,
              items: [],
              groupId: entry.requestGroup,
              status: isPaied
                ? "PAID"
                : isWaiting
                ? "Waiting For Payment"
                : "ORDERED",
            };
          }

          requestedItems.forEach((item, i) => {
            grouped[patientKey].items.push({
              id: `${entry.patientCardNumber}-${i}-${dateTime.getTime()}`,
              idNum: item?.id,
              medication: item.requestedServices,
              dosage: item.measurement,
              requeststatus: item.requeststatus,
              frequency: item.procedeureCount,
              duration: item.duration,
              instructions: item.instruction,
              price: item.price || 0,
              isSelected: true,
            });
          });
        });

        const modData = Object.fromEntries(
          Object.entries(grouped || {})
            .filter(([_, value]) => value?.items?.length > 0)
            .sort(([_, a], [__, b]) => {
              if (b.dateTime !== a.dateTime) {
                return b.dateTime - a.dateTime;
              }
              if (b.requestedStatusId < a.requestedStatusId) return -1;
              if (b.requestedStatusId > a.requestedStatusId) return 1;
              return 0;
            })
        );

        setGroupedRequests(modData);
      } catch (err) {
        console.error("Error fetching requests", err);
        toast.error("Failed to load prescriptions.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [refresh]);

  // Filter prescriptions
  useEffect(() => {
    const term = searchTerm?.toLowerCase();
    const filtered = Object.entries(groupedRequests || {})?.filter(
      ([, group]) =>
        group?.patientName?.toLowerCase().includes(term) ||
        group?.cardNumber?.toLowerCase().includes(term)
    );

    setFilteredRequests(Object.fromEntries(filtered || {}));
  }, [searchTerm, groupedRequests]);

  // Handle payment dialog open
  const handlePayAllClick = (groupKey) => {
    setSelectedGroupKey(groupKey);
    setPaymentDialogOpen(true);
  };

  const closeDialog = () => {
    setSelectedGroupKey(null);
    setPaymentDialogOpen(false);
  };

  // Submit payment
  const handlePaymentSubmit = async () => {
    try {
      setIsSending(true);
      const group = groupedRequests[selectedGroupKey];

      // Validation checks
      if (
        !group?.items?.some(
          (item) => item.isSelected === true && item.price > 0
        )
      ) {
        toast.error("You need to have at least one payment.");
        return;
      }

      if (group?.items?.some((item) => item.isSelected && item.price <= 0)) {
        toast.error("You need to have an amount for every selected medicine.");
        return;
      }

      const selectedItems = group.items.filter((item) => item.isSelected);
      const unselectedItems = group.items.filter((item) => !item.isSelected);

      if (unselectedItems?.length > 0) {
        // 1. Cancel all unselected items sequentially or concurrently but fail fast if any fail
        await Promise.all(
          unselectedItems.map((item) =>
            api.delete(`/Request/doctor/cancel-request/${item?.idNum}`)
          )
        );
      }

      // If cancellations succeed, proceed to send all selected items
      const sendResponses = [];
      for (const item of selectedItems) {
        try {
          const response = await api.put("/Request/doctor/pend-request", {
            id: item?.idNum || "-",
            patientCardnumber: group.cardNumber || "-",
            groupId: group.groupId || "-",
            price: item.price || 0,
          });

          sendResponses.push({
            id: item.id,
            success: true,
            data: response.data,
          });
        } catch (sendError) {
          console.error(`Error sending request ID ${item.id}:`, sendError);
          sendResponses.push({ id: item.id, success: false, error: sendError });
        }
      }

      toast.success("Payment requests processed successfully.");
      setRefresh((prev) => !prev);
      resetGroupData();
    } catch (cancelError) {
      // If any cancellation fails, no sends are done
      console.error("Cancellation failed:", cancelError);
      toast.error(
        "Failed to cancel some requests. No payments were processed."
      );
    } finally {
      setIsSending(false);
    }
  };

  // Status display component
  const StatusBadge = ({ status }) => {
    const colorKey = status in STATUS_ICONS ? status : "ORDERED";
    const icon = STATUS_ICONS[colorKey];
    const chipColor = STATUS_COLORS[colorKey] || "default";

    return (
      <Chip
        icon={icon}
        label={status}
        color={chipColor}
        size="small"
        sx={{
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: 0.7,
          borderRadius: 1.5,
          px: 1.5,
          py: 0.5,
          boxShadow: (theme) =>
            `0 2px 6px ${alpha(
              theme.palette[chipColor]?.main || theme.palette.grey[500],
              0.3
            )}`,
          "& .MuiChip-icon": {
            color: (theme) =>
              theme.palette[chipColor]?.contrastText || "inherit",
            marginLeft: 0,
            marginRight: 0.5,
          },
          "& .MuiChip-label": {
            fontSize: "0.75rem",
          },
        }}
        aria-label={`Status: ${status}`}
      />
    );
  };

  return (
    <Box
      sx={{
        p: 4,
        minHeight: "100vh",
        background: theme.palette.background.default,
      }}
    >
      <Paper
        elevation={3}
        sx={{
          maxWidth: 1400,
          mx: "auto",
          p: 4,
          borderRadius: 3,
          backgroundColor: theme.palette.mode === "dark" && "#1f2a406b",
          boxShadow: theme.shadows[4],
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", mb: 3 }}>
          <LocalPharmacy
            sx={{
              mr: 2,
              fontSize: 40,
              color: "#3a8adc",
            }}
          />
          <Typography variant="h4" fontWeight={700}>
            Pharmacy Prescription Manager
          </Typography>
        </Box>

        <TextField
          fullWidth
          label="Search by Patient Name or Card Number"
          variant="outlined"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          sx={{
            mb: 3,
            "& .MuiOutlinedInput-root": {
              borderRadius: 2,
              boxShadow: theme.shadows[1],
            },
          }}
          InputProps={{
            endAdornment: (
              <Badge
                badgeContent={Object.keys(filteredRequests).length}
                color="secondary"
                anchorOrigin={{
                  vertical: "top",
                  horizontal: "right",
                }}
                max={99}
              >
                <ClipboardList color="#2e8ac9" />
              </Badge>
            ),
            sx: {
              "& .MuiOutlinedInput-notchedOutline": {
                borderColor: theme.palette.mode === "dark" ? "#fff" : "#000",
              },
              "&:hover .MuiOutlinedInput-notchedOutline": {
                borderColor: theme.palette.mode === "dark" ? "#fff" : "#000",
              },
              "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                borderColor: theme.palette.mode === "dark" ? "#fff" : "#000",
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
        />
        <Divider sx={{ my: 3, borderWidth: 1 }} />
        <Button
          variant="contained"
          color="secondary"
          sx={{
            display: "flex",
            justifySelf: "flex-end",
          }}
          onClick={() => setRefresh((prev) => !prev)}
        >
          {loading ? (
            <CircularProgress size={24} color="inherit" />
          ) : (
            <Refresh
              sx={{
                transition: "transform 0.5s",
                "&:hover": { transform: "rotate(90deg)" },
              }}
            />
          )}
        </Button>
        <Divider sx={{ my: 3, borderWidth: 1 }} />

        {loading ? (
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              minHeight: "80vh",
            }}
          >
            <CircularProgress size={24} color="inherit" />
            <Typography sx={{ ml: 2 }}>Loading prescriptions...</Typography>
          </Box>
        ) : Object.keys(filteredRequests).length === 0 ? (
          <Typography
            variant="h6"
            align="center"
            sx={{ py: 4, color: theme.palette.text.secondary }}
          >
            No active prescriptions found
          </Typography>
        ) : (
          Object.entries(filteredRequests).map(([key, group]) => (
            <Accordion
              key={key}
              sx={{
                mb: 2,
                borderRadius: 2,
                boxShadow: theme.shadows[2],
                "&:before": { display: "none" },
              }}
            >
              <AccordionSummary
                expandIcon={<ExpandMore />}
                sx={{
                  backgroundColor:
                    theme.palette.mode === "dark"
                      ? "#1f2a40"
                      : theme.palette.background.paper,
                  borderLeft: `4px solid #2e8ac9`,
                  borderRadius: 2,
                }}
              >
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={12} md={3}>
                    <Box sx={{ display: "flex", alignItems: "center" }}>
                      <Avatar
                        sx={{
                          bgcolor: "#2e8ac9",
                          mr: 2,
                          width: 40,
                          height: 40,
                        }}
                      >
                        <Person />
                      </Avatar>
                      <Box>
                        <Typography fontWeight={600}>
                          {group.patientName}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Card: {group.cardNumber}
                        </Typography>
                      </Box>
                    </Box>
                  </Grid>

                  <Grid item xs={12} md={3}>
                    <Box sx={{ display: "flex", alignItems: "center" }}>
                      <CalendarToday sx={{ mr: 1, color: "#2e8ac9" }} />
                      <Typography>{group.dateTime.toLocaleString()}</Typography>
                    </Box>
                  </Grid>

                  <Grid item xs={12} md={3}>
                    <Box sx={{ display: "flex", alignItems: "center" }}>
                      <MedicalInformation sx={{ mr: 1, color: "#6870fab0" }} />
                      <Typography>
                        {group.doctor} ({group.department})
                      </Typography>
                    </Box>
                  </Grid>

                  <Grid item xs={12} md={3} sx={{ textAlign: "right" }}>
                    <StatusBadge status={group.status} />
                  </Grid>
                </Grid>
              </AccordionSummary>

              <AccordionDetails
                sx={{
                  backgroundColor: theme.palette.background.default,
                  pt: 0,
                }}
              >
                <MyDataGrid
                  rows={group.items}
                  columns={columns}
                  disableSelectionOnClick
                  hideFooterSelectedRowCount
                  getRowId={(row) => row.id}
                  sx={{
                    border: `1px solid ${theme.palette.divider}`,
                    borderRadius: 2,
                    marginTop: "10px",
                    bgcolor: theme.palette.background.paper,
                  }}
                  slots={{
                    footer: () => (
                      <GridFooterContainer>
                        <Box
                          sx={{
                            px: 2,
                            py: 1,
                            width: "100%",
                            display: "flex",
                            justifyContent: "flex-end",
                            bgcolor:
                              theme.palette.mode === "light"
                                ? theme.palette.grey[100]
                                : theme.palette.background.default,
                          }}
                        >
                          <Typography variant="subtitle1" fontWeight={600}>
                            Total:{" "}
                            {group?.items
                              ?.reduce(
                                (sum, item) => sum + (item.price || 0),
                                0
                              )
                              .toFixed(2)}{" "}
                            ETB
                          </Typography>
                        </Box>
                        {/* <GridFooter /> */}
                      </GridFooterContainer>
                    ),
                  }}
                />

                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "flex-end",
                    gap: 2,
                    mt: 3,
                  }}
                >
                  <Button
                    variant="contained"
                    startIcon={<Payment />}
                    onClick={() => handlePayAllClick(key)}
                    disabled={
                      group?.status?.toLowerCase()?.includes("paid") ||
                      group?.status?.toLowerCase()?.includes("waiting")
                    }
                    sx={{
                      borderRadius: 2,
                      px: 3,
                      py: 1,
                      boxShadow: theme.shadows[2],
                      backgroundColor:
                        theme.palette.mode === "dark"
                          ? theme.palette.success.main
                          : "#ed6c02",
                    }}
                  >
                    Process Payment
                  </Button>
                </Box>
              </AccordionDetails>
            </Accordion>
          ))
        )}

        {/* Payment Modal */}
        <Dialog
          open={paymentDialogOpen}
          onClose={(event, reason) => {
            if (reason !== "backdropClick" && reason !== "escapeKeyDown") {
              resetGroupData(); // Reset and close the modal
            }
          }}
          maxWidth="sm"
          fullWidth
          disableEnforceFocus // to remove focus warning
          BackdropProps={{ style: { backgroundColor: "rgba(0,0,0,0.5)" } }}
        >
          <DialogTitle
            sx={{
              backgroundColor: "#174564",
              color: theme.palette.common.white,
              display: "flex",
              alignItems: "center",
            }}
          >
            <Paid sx={{ mr: 2 }} />
            Process Payment
          </DialogTitle>
          <DialogContent sx={{ py: 3 }}>
            {selectedGroupKey && (
              <>
                <TableContainer
                  component={Paper}
                  sx={{ marginTop: "20px" }}
                  variant="outlined"
                >
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 600 }}>
                          Medication
                        </TableCell>
                        <TableCell sx={{ fontWeight: 600 }} align="right">
                          Price (ETB)
                        </TableCell>
                        <TableCell sx={{ fontWeight: 600 }} align="right">
                          Select
                        </TableCell>
                        <TableCell sx={{ fontWeight: 600 }} align="right">
                          Amount
                        </TableCell>
                      </TableRow>
                    </TableHead>

                    <TableBody>
                      {group?.items.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell>{item.medication}</TableCell>

                          <TableCell align="right">
                            {item.price?.length > 0
                              ? item.price?.toFixed(2)
                              : item.price}{" "}
                            ETB
                          </TableCell>

                          <TableCell align="right">
                            <FormControlLabel
                              control={
                                <Checkbox
                                  checked={item?.isSelected || false}
                                  onChange={(e) =>
                                    handleCheckboxChange(e, index)
                                  }
                                  sx={{
                                    color: checkboxColor,
                                    "&.Mui-checked": {
                                      color: checkboxColor,
                                    },
                                  }}
                                />
                              }
                              label={item?.isSelected ? "Deselect" : "Select"}
                              sx={{
                                ml: 1,
                                "& .MuiFormControlLabel-label": {
                                  fontWeight: 500,
                                  color: item?.isSelected
                                    ? theme.palette.success.main
                                    : theme.palette.text.primary,
                                },
                              }}
                            />
                          </TableCell>

                          <TableCell align="right">
                            <TextField
                              variant="outlined"
                              type="number"
                              size="small"
                              onWheel={(e) => e.target.blur()} // <-- Prevent scroll change
                              inputProps={{ min: 0 }}
                              value={item.price || ""}
                              onChange={(e) => handleAmountChange(e, index)}
                              sx={{ width: 80 }}
                              InputProps={{
                                sx: {
                                  "& .MuiOutlinedInput-notchedOutline": {
                                    borderColor:
                                      theme.palette.mode === "dark"
                                        ? "#fff"
                                        : "#000",
                                  },
                                  "&:hover .MuiOutlinedInput-notchedOutline": {
                                    borderColor:
                                      theme.palette.mode === "dark"
                                        ? "#fff"
                                        : "#000",
                                  },
                                  "&.Mui-focused .MuiOutlinedInput-notchedOutline":
                                    {
                                      borderColor:
                                        theme.palette.mode === "dark"
                                          ? "#fff"
                                          : "#000",
                                    },
                                  color:
                                    theme.palette.mode === "dark"
                                      ? "#fff"
                                      : "#000",
                                },
                              }}
                              InputLabelProps={{
                                sx: {
                                  color:
                                    theme.palette.mode === "dark"
                                      ? "#ccc"
                                      : "#555",
                                  "&.Mui-focused": {
                                    color:
                                      theme.palette.mode === "dark"
                                        ? "#fff"
                                        : "#000",
                                  },
                                },
                              }}
                            />
                          </TableCell>
                        </TableRow>
                      ))}

                      <TableRow
                        sx={{
                          borderTop: `2px solid ${theme.palette.divider}`,
                          backgroundColor:
                            theme.palette.mode === "light"
                              ? theme.palette.grey[100]
                              : theme.palette.background.paper,
                        }}
                      >
                        <TableCell sx={{ fontWeight: 600 }}>Total</TableCell>
                        <TableCell sx={{ fontWeight: 600, textAlign: "right" }}>
                          {formatAccounting2(
                            isNaN(totalSelectedPrice) ? 0 : totalSelectedPrice
                          )}
                          ETB
                        </TableCell>
                        <TableCell colSpan={2} />
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>

                <Box sx={{ mt: 3 }}>
                  <Typography variant="subtitle1" gutterBottom>
                    <strong>Payment Method</strong>
                  </Typography>
                </Box>
              </>
            )}
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button
              onClick={() => resetGroupData()}
              variant="outlined"
              color="error"
              sx={{ mr: 2 }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => handlePaymentSubmit()}
              sx={{ backgroundColor: "#174564" }}
              variant="contained"
              disabled={isSending}
              startIcon={<CheckCircleOutline />}
            >
              {isSending ? (
                <CircularProgress size={24} color="inherit" />
              ) : (
                "Confirm Payment"
              )}
            </Button>
          </DialogActions>
        </Dialog>
      </Paper>
      <ToastContainer />
    </Box>
  );
};

export default Pharmacy;
