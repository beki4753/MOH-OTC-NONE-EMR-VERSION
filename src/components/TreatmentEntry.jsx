import React, { useState, useEffect, useMemo } from "react";
import {
  Box,
  Typography,
  Button,
  CircularProgress,
  Paper,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Tabs,
  Tab,
  TextField,
  Grid,
  FormControlLabel,
  Checkbox,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import TaskAltIcon from "@mui/icons-material/TaskAlt";
import { CheckBox, Refresh } from "@mui/icons-material";
import { ToastContainer, toast } from "react-toastify";
import { useTheme } from "@mui/material/styles";
import api from "../utils/api";
import "react-toastify/dist/ReactToastify.css";
import CloseIcon from "@mui/icons-material/Close";
import FolderSpecialIcon from "@mui/icons-material/FolderSpecial";
import MedicalServicesIcon from "@mui/icons-material/MedicalServices";
import AssignmentLateIcon from "@mui/icons-material/AssignmentLate";
import Fade from "@mui/material/Fade";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import PaidIcon from "@mui/icons-material/Paid";
import HourglassEmptyIcon from "@mui/icons-material/HourglassEmpty";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import { getTokenValue } from "../services/user_service";

// Utility function to return icon + color based on status
const getStatusIcon = (status, theme) => {
  try {
    const lowerStatus = (status || "").toLowerCase();
    switch (lowerStatus) {
      case "completed":
        return <CheckCircleIcon fontSize="small" sx={{ color: "green" }} />;
      case "paid":
        return (
          <PaidIcon
            fontSize="small"
            sx={{ color: theme?.palette?.mode === "dark" ? "#388ada" : "blue" }}
          />
        );
      case "ordered":
        return <HourglassEmptyIcon fontSize="small" sx={{ color: "orange" }} />;
      case "failed":
        return <CancelIcon fontSize="small" sx={{ color: "red" }} />;
      default:
        return <HelpOutlineIcon fontSize="small" sx={{ color: "grey.600" }} />;
    }
  } catch (error) {
    console.error("This is getStatusIcon Error : ", error);
  }
};

const tokenValue = getTokenValue();

const TreatmentEntry = () => {
  const theme = useTheme();
  const [treatments, setTreatments] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [refresh, setRefresh] = useState(false);
  const [tabValue, setTabValue] = useState("all");
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedTests, setSelectedTests] = useState([]);
  const [patientName, setPatientName] = useState("");
  const [requestedFrom, setRequestedFrom] = useState("");

  const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
  const [testsToComplete, setTestsToComplete] = useState([]);
  const [completedSelectedTests, setCompletedSelectedTests] = useState([]);
  const [completingPatient, setCompletingPatient] = useState({});
  const [completeIsLoading, setCompleteIsLoading] = useState(false);

  // Define checkbox color based on theme mode
  const checkboxColor =
    theme.palette.mode === "light"
      ? theme.palette.primary.main
      : theme.palette.secondary.main;

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        setTreatments([]);
        const requestedTo = tokenValue?.UserType?.toLowerCase()?.includes("mlt")
          ? "/Request/doctor/get-request-lab"
          : "/Request/doctor/get-request-radiology";

        const res = await api.get(requestedTo);
        const raw = res?.data?.data?.value || [];
        raw.sort((a, b) => new Date(b.createdOn) - new Date(a.createdOn));

        const groupedMap = new Map();

        raw.forEach((item) => {
          const name = [
            item.patientFirstName,
            item.patientMiddleName,
            item.patientLastName,
          ]
            .filter(Boolean)
            .join(" ");
          const key = `${item.patientCardNumber}-${
            item.requestedDepartment
          }-${item.createdOn.slice(0, 16).replace("T", " ")}`;

          if (!groupedMap.has(key)) {
            groupedMap.set(key, {
              id: key,
              patientCardNumber: item.patientCardNumber,
              patientFName: name,
              requestedReason: item.requestedDepartment,
              requestGroup: item.requestingDepartment,
              createdOn: item.createdOn.slice(0, 16).replace("T", " "),
              tests: [],
              paid: [],
              totalPrice: 0,
              requestedItems: [],
            });
          }

          const group = groupedMap.get(key);
          item.requestedItems.forEach((i) => {
            group.tests.push(i.requestedServices || "Unknown");
            group.paid.push(i.requeststatus || "Unpaid");
            group.totalPrice += i.price || 0;
            group.requestedItems.push(i);
          });
        });

        const grouped = Array.from(groupedMap.values());

        setTreatments(grouped);
      } catch (err) {
        console.error("This is fetchData Error : ", err);
        toast.error(err?.response?.data?.msg || "Failed to fetch data");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [refresh]);

  const paidTabs = useMemo(() => {
    try {
      const statuses =
        treatments?.length > 0
          ? new Set(
              treatments.flatMap((t) =>
                Array.isArray(t?.paid)
                  ? t.paid.map((p) => p || "Unpaid")
                  : ["Unpaid"]
              )
            )
          : [];

      return Array.from(statuses)?.length > 0
        ? ["all", ...Array.from(statuses)]
        : [];
    } catch (error) {
      console.error("getTabs Error:", error);
      return ["all"];
    }
  }, [treatments]);

  const filtered = useMemo(() => {
    return treatments?.length > 0
      ? treatments?.filter((row) => {
          const lowerStatuses = row?.paid?.map((status) =>
            (status || "").toLowerCase()
          );

          // Match against tab value
          const matchesTab =
            tabValue === "all"
              ? true
              : lowerStatuses?.includes(tabValue?.toLowerCase());

          const matchesSearch =
            row.patientFName.toLowerCase().includes(search.toLowerCase()) ||
            row.patientCardNumber.toLowerCase().includes(search.toLowerCase());

          return matchesTab && matchesSearch;
        })
      : [];
  }, [treatments, tabValue, search]);

  const columns = [
    { field: "patientCardNumber", headerName: "Card Number", flex: 1 },
    { field: "patientFName", headerName: "Patient Name", flex: 1 },
    { field: "requestedReason", headerName: "Category", flex: 1 },
    { field: "tests", headerName: "Tests", flex: 2 },
    { field: "requestGroup", headerName: "Requested From", flex: 1 },
    { field: "totalPrice", headerName: "Amount", flex: 1 },
    {
      field: "paid",
      headerName: "Status",
      flex: 1,
      renderCell: (params) => {
        try {
          const distinctValue = new Set(params?.row?.paid);
          return Array.from(distinctValue || [])?.join(", ");
        } catch (error) {
          console.error(error);
          return "";
        }
      },
    },
    { field: "createdOn", headerName: "Date", flex: 1 },
    {
      field: "Action",
      headerName: "Action",
      flex: 1.5,
      renderCell: (params) =>
        params?.row?.paid.some((p) => p?.toLowerCase() === "paid") && (
          <Button
            variant="outlined"
            startIcon={<TaskAltIcon />}
            onClick={() => {
              setTestsToComplete(params.row.requestedItems);
              setCompletedSelectedTests([]);
              setCompletingPatient({
                name: params.row.patientFName,
                group: params.row.requestGroup,
              });
              setCompleteDialogOpen(true);
            }}
            color={theme.palette.mode === "dark" ? "secondary" : "primary"}
            sx={{
              color: theme.palette.mode === "light" ? "#2e8ac9" : "secondary",
              border: `1px solid ${
                theme.palette.mode === "light" ? "rgb(82 158 210)" : "secondary"
              }`,
            }}
          >
            Mark Completed
          </Button>
        ),
    },
  ];

  const handleCloseMarkAsCompletedModal = () => {
    setCompleteDialogOpen(false);
    setCompletingPatient({});
    setTestsToComplete([]);
  };

  const handleCloseViewDetailsModal = () => {
    setDialogOpen(false);
    setPatientName("");
    setRequestedFrom("");
    setSelectedTests([]);
  };

  const handleMarkAsCompleted = async () => {
    try {
      setCompleteIsLoading(true);
      const responses = await Promise.all(
        completedSelectedTests.map((item) => {
          const numericId = Number(item.id);
          return api.put("/Request/doctor/complete-request", numericId, {
            headers: {
              "Content-Type": "application/json",
            },
          });
        })
      );

      if (responses?.every((res) => res?.status === 200)) {
        toast.success(
          `${completedSelectedTests.length} test(s) marked as completed`
        );
        setCompleteDialogOpen(false);
        setRefresh((p) => !p);
      }
    } catch (err) {
      console.error("This is handleMarkAsCompleted Error : ", err);
      toast.error(`${err}`);
    } finally {
      setCompleteIsLoading(false);
    }
  };

  const handleDoubleClick = (params, event) => {
    try {
      if (
        event.target.nodeName === "BUTTON" ||
        event.currentTarget.querySelector("button")?.contains(event.target)
      )
        return;
      setSelectedTests(params.row.requestedItems);
      setPatientName(params.row.patientFName);
      setRequestedFrom(params.row.requestGroup);
      setDialogOpen(true);
    } catch (error) {
      console.error("This is handleDoubleClick Error : ", error);
    }
  };

  const handleCategorySelect = (event) => {
    const { checked, name: categoryName } = event.target;

    // All tests in the category
    const categoryTests = testsToComplete.filter(
      (t) =>
        t.requestCatagory === categoryName &&
        (t.requeststatus || "").toLowerCase() === "paid"
    );

    // Update selected tests
    setCompletedSelectedTests((prev) => {
      if (checked) {
        // Add all category tests not already selected
        const toAdd = categoryTests.filter((test) => !prev.includes(test));
        return [...prev, ...toAdd];
      } else {
        // Remove all tests in category
        return prev.filter((test) => test.requestCatagory !== categoryName);
      }
    });
  };

  return (
    <Box p={4}>
      <Typography
        variant="h4"
        align="center"
        fontWeight={700}
        sx={{ mb: 4, color: theme.palette.mode === "dark" ? "#fff" : "#000" }}
      >
        Patient Treatment Entry
      </Typography>

      <Paper sx={{ mb: 2, borderRadius: 2 }}>
        {paidTabs?.length > 0 ? (
          <Tabs
            value={paidTabs.includes(tabValue) ? tabValue : "all"}
            onChange={(e, newVal) => setTabValue(newVal)}
            variant="fullWidth"
            sx={{
              "& .MuiTab-root": {
                textTransform: "capitalize",
                fontWeight: 600,
                borderRadius: 2,
                mx: 1,
                color: theme.palette.mode === "dark" ? "#aaa" : "#333",
              },
              "& .Mui-selected": {
                backgroundColor: "#2e8ac9",
                color:
                  theme.palette.mode === "dark"
                    ? "#000000DE"
                    : "#fff !important",
              },
              "& .MuiTabs-indicator": { display: "none" },
            }}
          >
            {paidTabs.map((status, index) => (
              <Tab
                key={index}
                label={status === "all" ? "All" : status}
                value={status}
              />
            ))}
          </Tabs>
        ) : (
          <Box display="flex" justifyContent="center" py={2}>
            <CircularProgress size={24} color="inherit" />
          </Box>
        )}
      </Paper>

      <TextField
        fullWidth
        label="Search..."
        variant="outlined"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        sx={{ mb: 2 }}
        InputProps={{
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

      <Box mb={2}>
        <Grid container justifyContent="flex-end">
          <Button
            variant="outlined"
            onClick={() => setRefresh((p) => !p)}
            disabled={isLoading}
            color={theme.palette.mode === "dark" ? "secondary" : "primary"}
          >
            {isLoading ? <CircularProgress size={24} /> : <Refresh />}
          </Button>
        </Grid>
      </Box>

      <Paper elevation={3}>
        <DataGrid
          rows={filtered}
          columns={columns}
          loading={isLoading}
          getRowId={(row) => row.id}
          onRowDoubleClick={(params, event) => handleDoubleClick(params, event)}
          autoHeight
          sx={{ minWidth: 320 }}
        />
      </Paper>

      {/* View Details Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={(event, reason) => {
          if (reason !== "backdropClick" && reason !== "escapeKeyDown") {
            handleCloseViewDetailsModal();
          }
        }}
        fullWidth
        maxWidth="sm"
        TransitionComponent={Fade}
        disableEnforceFocus // to remove focus warning
        BackdropProps={{ "aria-hidden": false }}
      >
        <DialogTitle
          sx={{
            bgcolor: "#166295",
            color: "primary.contrastText",
            py: 2,
            px: 3,
          }}
        >
          <Box
            display="flex"
            justifyContent="space-between"
            alignItems="center"
          >
            <Typography variant="h6">
              Tests for <strong>{patientName}</strong> from{" "}
              <strong>{requestedFrom}</strong>
            </Typography>
            <IconButton
              onClick={() => handleCloseViewDetailsModal()}
              sx={{ color: "primary.contrastText" }}
            >
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>

        <DialogContent dividers sx={{ py: 3, px: 3 }}>
          {selectedTests?.length > 0 ? (
            <Box sx={{ maxHeight: "60vh", overflow: "auto", pr: 1 }}>
              {Object.entries(
                selectedTests?.length > 0
                  ? selectedTests?.reduce((acc, test) => {
                      const category = test?.requestCatagory;
                      if (!acc[category]) acc[category] = [];
                      acc[category].push(test);
                      return acc;
                    }, {})
                  : {}
              )?.map(([category, tests]) => (
                <Box
                  key={category}
                  mb={3}
                  sx={{
                    borderLeft: "4px solid",
                    borderColor: "#398bdb",
                    pl: 2,
                  }}
                >
                  <Typography
                    variant="subtitle1"
                    fontWeight="bold"
                    color={theme.palette.mode === "dark" ? "#fff" : "#000"}
                  >
                    <FolderSpecialIcon fontSize="small" /> {category}
                  </Typography>
                  <Stack spacing={1.5} pl={2}>
                    {tests.map((test, index) => (
                      <Paper
                        key={index}
                        sx={{
                          p: 1.5,
                          border: "1px solid",
                          borderColor: "divider",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <Box display="flex" alignItems="center" gap={1}>
                          <MedicalServicesIcon fontSize="small" />
                          <Typography>{test.requestedServices}</Typography>
                        </Box>
                        <Box display="flex" alignItems="center" gap={1}>
                          {getStatusIcon(test.requeststatus, theme)}
                          <Typography variant="body2" color="text.secondary">
                            {test.requeststatus}
                          </Typography>
                        </Box>
                      </Paper>
                    ))}
                  </Stack>
                </Box>
              ))}
            </Box>
          ) : (
            <Box textAlign="center" py={4}>
              <AssignmentLateIcon sx={{ fontSize: 60 }} color="disabled" />
              <Typography variant="h6" color="text.secondary">
                No tests available
              </Typography>
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 3 }}>
          <Button
            onClick={() => handleCloseViewDetailsModal()}
            color="secondary"
            variant="contained"
            startIcon={<CloseIcon />}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Mark Complete Dialog */}
      <Dialog
        open={completeDialogOpen}
        onClose={(event, reason) => {
          if (reason !== "backdropClick" && reason !== "escapeKeyDown") {
            handleCloseMarkAsCompletedModal();
          }
        }}
        fullWidth
        maxWidth="sm"
        TransitionComponent={Fade}
        disableEnforceFocus // to remove focus warning
        BackdropProps={{ "aria-hidden": false }}
      >
        <DialogTitle
          sx={{
            bgcolor: "#166295",
            color: "primary.contrastText",
            py: 2,
            px: 3,
          }}
        >
          <Box
            display="flex"
            justifyContent="space-between"
            alignItems="center"
          >
            <Typography variant="h6">
              Select tests to complete for{" "}
              <strong>{completingPatient?.name || "Unknown"}</strong>
            </Typography>
            <IconButton
              onClick={() => handleCloseMarkAsCompletedModal()}
              sx={{ color: "primary.contrastText" }}
            >
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers sx={{ py: 3, px: 3 }}>
          {testsToComplete?.filter(
            (t) => (t?.requeststatus || "").toLowerCase() === "paid"
          )?.length > 0 ? (
            <Box sx={{ maxHeight: "60vh", overflow: "auto", pr: 1 }}>
              {Object.entries(
                testsToComplete
                  ?.filter(
                    (t) => (t.requeststatus || "").toLowerCase() === "paid"
                  )
                  ?.reduce((acc, test) => {
                    const category = test.requestCatagory;
                    if (!acc[category]) acc[category] = [];
                    acc[category].push(test);
                    return acc;
                  }, {})
              ).map(([category, tests]) => {
                const selectedCount = tests.filter((test) =>
                  completedSelectedTests.includes(test)
                ).length;
                const totalCount = tests.length;

                const checked = selectedCount === totalCount && totalCount > 0;
                const indeterminate =
                  selectedCount > 0 && selectedCount < totalCount;

                return (
                  <Box
                    key={category}
                    mb={3}
                    sx={{ borderLeft: "4px solid #398bdb", pl: 2 }}
                  >
                    <Typography variant="subtitle1" fontWeight="bold" mb={1}>
                      <FormControlLabel
                        label={
                          <>
                            <FolderSpecialIcon fontSize="small" /> {category}
                          </>
                        }
                        name={category}
                        control={
                          <Checkbox
                            checked={checked}
                            indeterminate={indeterminate}
                            onChange={handleCategorySelect}
                            sx={{
                              color: checkboxColor,
                              "&.Mui-checked": {
                                color: checkboxColor,
                              },
                            }}
                          />
                        }
                      />
                    </Typography>
                    <Stack spacing={1.5} pl={2}>
                      {tests.map((test, index) => {
                        const isSelected =
                          completedSelectedTests.includes(test);
                        return (
                          <Paper
                            key={index}
                            onClick={() => {
                              setCompletedSelectedTests((prev) =>
                                isSelected
                                  ? prev.filter((t) => t !== test)
                                  : [...prev, test]
                              );
                            }}
                            sx={{
                              p: 1.5,
                              display: "flex",
                              alignItems: "center",
                              gap: 2,
                              border: "1px solid",
                              borderColor: "divider",
                              bgcolor: isSelected
                                ? "action.selected"
                                : "background.paper",
                              cursor: "pointer",
                            }}
                          >
                            <input
                              type="checkbox"
                              readOnly
                              checked={isSelected}
                            />
                            <Typography>
                              <MedicalServicesIcon fontSize="small" />{" "}
                              {test.requestedServices}
                            </Typography>
                          </Paper>
                        );
                      })}
                    </Stack>
                  </Box>
                );
              })}
            </Box>
          ) : (
            <Box textAlign="center" py={4}>
              <AssignmentLateIcon sx={{ fontSize: 60 }} color="disabled" />
              <Typography variant="h6" color="text.secondary">
                No paid tests available for completion
              </Typography>
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 3 }}>
          <Button
            onClick={() => handleMarkAsCompleted()}
            variant="contained"
            color={theme.palette.mode === "dark" ? "secondary" : "primary"}
            disabled={completedSelectedTests?.length === 0 || completeIsLoading}
          >
            {completeIsLoading ? (
              <CircularProgress size={24} color="inherit" />
            ) : (
              "Complete Selected Tests"
            )}
          </Button>
          <Button
            onClick={() => handleCloseMarkAsCompletedModal()}
            variant="outlined"
            color="error"
          >
            Cancel
          </Button>
        </DialogActions>
      </Dialog>

      <ToastContainer />
    </Box>
  );
};

export default TreatmentEntry;
