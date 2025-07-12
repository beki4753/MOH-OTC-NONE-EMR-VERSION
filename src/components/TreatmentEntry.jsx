import React, { useState, useEffect, useMemo } from "react";
import {
  Box,
  Typography,
  Grid,
  Button,
  CircularProgress,
  Paper,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  List,
  ListItem,
  Tabs,
  Tab,
  TextField,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import TaskAltIcon from "@mui/icons-material/TaskAlt";
import { Refresh } from "@mui/icons-material";
import api from "../utils/api";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useTheme } from "@mui/material/styles";

const TreatmentEntry = () => {
  const theme = useTheme();

  const [treatmentList, setTreatmentList] = useState([]);
  const [refresh, setRefresh] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingRowId, setLoadingRowId] = useState(null);
  const [patientName, setPatientName] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedTests, setSelectedTests] = useState([]);
  const [requestedFrom, setRequestedFrom] = useState([]);
  const [tabValue, setTabValue] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  // Fetch treatment list
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const resp = await api.get("/Request/doctor/get-request-lab");
        const value = resp?.data?.data?.value || [];
        value.sort((a, b) => new Date(b.createdOn) - new Date(a.createdOn));

        const flat = value.flatMap((item, idx) =>
          item.requestedItems.map((entry, subIdx) => ({
            id: idx * 100 + subIdx + 1,
            patientCardNumber: item.patientCardNumber,
            patientFName: [
              item.patientFirstName,
              item.patientMiddleName,
              item.patientLastName,
            ]
              .filter(Boolean)
              .join(" "),
            requestedReason: item.requestedDepartment,
            subCatagory: entry.requestCatagory,
            totalPrice: item.requestedItems.reduce(
              (acc, i) => acc + i.price,
              0
            ),
            paid: entry.requeststatus, // May be undefined/null
            createdOn: item.createdOn,
            requestGroup: item.requestingDepartment,
            tests: item.requestedItems.map(
              (i) => i.requestedServices || "Unknown Test"
            ),
          }))
        );

        setTreatmentList(flat);
        setPatientName(flat[0]?.patientFName || "");
        setRequestedFrom(flat[0]?.requestGroup || "");
      } catch (err) {
        console.error("Fetch doctor requests error:", err);
        toast.error("Failed to load doctor requests.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [refresh]);

  // Dynamically extract unique paid status types
  const paidStatusTabs = useMemo(() => {
    const statuses = new Set(treatmentList.map((row) => row.paid || "Unpaid"));
    return ["all", ...Array.from(statuses)];
  }, [treatmentList]);
  const filteredRows = useMemo(() => {
    let rows = treatmentList;

    // Filter by tab
    if (tabValue !== "all") {
      rows = rows.filter((row) => (row.paid || "Unpaid") === tabValue);
    }

    // Filter by search term
    if (searchTerm.trim() !== "") {
      const lower = searchTerm.toLowerCase();
      rows = rows.filter(
        (row) =>
          row.patientFName.toLowerCase().includes(lower) ||
          row.patientCardNumber.toLowerCase().includes(lower)
      );
    }

    return rows;
  }, [tabValue, treatmentList, searchTerm]);

  const columns = [
    { field: "patientCardNumber", headerName: "Card Number", flex: 1 },
    { field: "patientFName", headerName: "Patient Name", flex: 1 },
    { field: "requestedReason", headerName: "Category", flex: 1 },
    { field: "subCatagory", headerName: "Sub Category", flex: 1 },
    {
      field: "tests",
      headerName: "Tests",
      flex: 2,
      renderCell: (params) => (
        <Typography
          sx={{ cursor: "pointer" }}
          onClick={() => {
            setSelectedTests(params.row.tests);
            setPatientName(params.row.patientFName);
            setRequestedFrom(params.row.requestGroup);
            setDialogOpen(true);
          }}
        >
          {params.row.tests.join(", ")}
        </Typography>
      ),
    },
    { field: "requestGroup", headerName: "Requested From", flex: 1 },
    { field: "totalPrice", headerName: "Amount", flex: 1 },
    { field: "paid", headerName: "Status", flex: 1 },
    { field: "createdOn", headerName: "Date", flex: 1 },
    {
      field: "Action",
      headerName: "Action",
      flex: 1,
      renderCell: (params) => {
        const isPaid = String(params.row.paid).toLowerCase() === "paid"; // or adjust logic if paid is boolean or numeric

        return isPaid ? (
          <Button
            variant="outlined"
            color="success"
            startIcon={<TaskAltIcon />}
            // onClick={() => handleMarkDone(params.row)}
            disabled={loadingRowId === params.row.id}
            sx={{ textTransform: "none", borderRadius: 2, fontWeight: 600 }}
          >
            {loadingRowId === params.row.id ? (
              <CircularProgress size={24} />
            ) : (
              "Mark Completed"
            )}
          </Button>
        ) : null;
      },
    },
  ];

  return (
    <Box p={4}>
      <Typography variant="h5" gutterBottom fontWeight="bold">
        Patient Treatment Entry
      </Typography>

      <Paper
        sx={{
          mb: 3,
          borderRadius: 2,
          backgroundColor:
            theme.palette.mode === "dark" ? "#1e1e1e" : "#f1f1f1",
        }}
      >
        <Tabs
          value={tabValue}
          onChange={(e, newVal) => setTabValue(newVal)}
          variant="fullWidth"
          sx={{
            "& .MuiTab-root": {
              textTransform: "capitalize",
              fontWeight: 600,
              borderRadius: 2,
              mx: 1,
              color: theme.palette.mode === "dark" ? "#aaa" : "#333",
              transition: "0.3s",
            },
            "& .Mui-selected": {
              backgroundColor: theme.palette.primary.main,
              color: "#fff !important",
            },
            "& .MuiTabs-indicator": {
              display: "none",
            },
          }}
        >
          {paidStatusTabs.map((status, index) => (
            <Tab
              key={index}
              label={status === "all" ? "All" : status}
              value={status}
            />
          ))}
        </Tabs>
      </Paper>
      <TextField
        fullWidth
        label="Search by Patient Name or Card Number"
        variant="outlined"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
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
        sx={{ mb: 3 }}
      />

      <Box mb={3} p={2} component={Paper} elevation={3} borderRadius={2}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={10}></Grid>
          <Grid item xs={12} md={2}>
            <Stack direction="row" spacing={2} justifyContent="flex-end">
              <Button
                variant="outlined"
                color={theme.palette.mode === "dark" ? "secondary" : "primary"}
                onClick={() => setRefresh((prev) => !prev)}
                disabled={isLoading}
              >
                {isLoading ? (
                  <CircularProgress size={24} color="inherit" />
                ) : (
                  <Refresh
                    sx={{
                      color: theme.palette.mode == "dark" ? "#fff" : "#000",
                      transition: "transform 0.5s",
                      "&:hover": { transform: "rotate(90deg)" },
                    }}
                  />
                )}
              </Button>
            </Stack>
          </Grid>
        </Grid>
      </Box>

      <Paper elevation={2} sx={{ height: 500 }}>
        <DataGrid
          rows={filteredRows}
          columns={columns}
          loading={isLoading}
          pageSize={10}
          rowsPerPageOptions={[10, 20, 50]}
          pagination
          disableSelectionOnClick
          getRowId={(row) => row.id}
        />
      </Paper>

      {/* Test Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth>
        <DialogTitle sx={{ textAlign: "center" }}>
          Requested Tests for{" "}
          <Typography
            component="span"
            sx={{ color: "primary.main", fontWeight: 600 }}
          >
            {patientName} from {requestedFrom}
          </Typography>
        </DialogTitle>
        <DialogContent
          sx={{
            backgroundColor:
              theme.palette.mode === "dark" ? "#121212" : "#f9f9f9",
          }}
        >
          <List dense>
            {selectedTests.map((test, index) => (
              <ListItem
                key={index}
                sx={{ fontWeight: "bold", fontSize: "0.95rem" }}
              >
                • {test}
              </ListItem>
            ))}
          </List>
        </DialogContent>
      </Dialog>

      <ToastContainer />
    </Box>
  );
};

export default TreatmentEntry;
