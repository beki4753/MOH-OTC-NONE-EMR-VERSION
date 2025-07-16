import React, { useState, useEffect } from "react";
import {
  Box,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  Checkbox,
  Typography,
  Divider,
  Paper,
  Grid,
  Button,
  Snackbar,
  Alert,
  Stack,
  TextField,
  Tooltip,
  CircularProgress,
  FormControlLabel,
  InputAdornment,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import { useTheme } from "@mui/material/styles";
import LabIcon from "@mui/icons-material/Science";
import RadiologyIcon from "@mui/icons-material/Radio";
import ProcedureIcon from "@mui/icons-material/MedicalServices";
import { ToastContainer, toast } from "react-toastify";
import api from "../utils/api";
import { fetchPatientName, getTokenValue } from "../services/user_service";
import FactCheckIcon from "@mui/icons-material/FactCheck";

const tokenvalue = getTokenValue();

const transformPaymentDataToServices = (rows) => {
  try {
    const structured = {};

    rows.forEach(({ purpose, group, subgroup, amount }) => {
      const groupKey = (group || "Other").trim().toLowerCase(); // Normalize group
      const subgroupKey = (subgroup || "General").trim(); // Display-friendly casing
      const testName = (purpose || "").trim();

      if (!structured[groupKey]) {
        structured[groupKey] = {};
      }

      if (!structured[groupKey][subgroupKey]) {
        structured[groupKey][subgroupKey] = [];
      }

      structured[groupKey][subgroupKey].push({
        purpose: testName,
        price: parseFloat(amount) || 0, // Ensure amount is a number
      });
    });

    // Optional: sort tests alphabetically by purpose
    Object.keys(structured).forEach((groupKey) => {
      const subgroups = structured[groupKey];
      Object.keys(subgroups).forEach((subKey) => {
        subgroups[subKey].sort((a, b) => a.purpose.localeCompare(b.purpose));
      });
    });

    return structured;
  } catch (error) {
    console.error("This is transformPaymentDataToServices Error:", error);
    return {};
  }
};

const extractLabPanels = (rows) => {
  try {
    const labPanels = {};
    const labPanelsMother = {};
    const categoriesWithPanels = new Set();

    for (const row of rows) {
      let { group, subgroup, shortCodes, purpose, amount } = row;

      if (shortCodes && subgroup) {
        // Normalize both group and shortCodes to lowercase
        const groupKey = group?.trim().toLowerCase();
        const shortCodeKey = shortCodes?.trim().toLowerCase();

        // Register the normalized group name
        categoriesWithPanels.add(groupKey);

        // Initialize panel entry
        if (!labPanels[shortCodeKey]) labPanels[shortCodeKey] = [];
        labPanels[shortCodeKey].push({ purpose: purpose, price: amount });

        // Map the shortCode to subgroup (for display)
        labPanelsMother[shortCodeKey] = subgroup;
      }
    }

    return {
      labPanels,
      labPanelsMother,
      categoriesWithPanels: Array.from(categoriesWithPanels),
    };
  } catch (error) {
    console.error("This is extractLabPanels Error:", error);
    return {
      labPanels: {},
      labPanelsMother: {},
      categoriesWithPanels: [],
    };
  }
};

const categoryIcons = {
  lab: <LabIcon fontSize="small" sx={{ mr: 1 }} />,
  Radiology: <RadiologyIcon fontSize="small" sx={{ mr: 1 }} />,
  Procedure: <ProcedureIcon fontSize="small" sx={{ mr: 1 }} />,
};

const getCategoryIcon = (key = "") => {
  try {
    if (!key || typeof key !== "string")
      return (
        <FactCheckIcon fontSize="small" sx={{ mr: 1, color: "grey.500" }} />
      );

    const foundKey = Object.keys(categoryIcons).find((iconKey) =>
      key.toLowerCase().includes(iconKey.toLowerCase())
    );

    return (
      categoryIcons[foundKey] || (
        <FactCheckIcon fontSize="small" sx={{ mr: 1, color: "grey.500" }} />
      )
    );
  } catch (error) {
    console.error("This is getCategoryIcon Error: ".error);
  }
};

const isAllEmpty = (map) =>
  Object.values(map || {})?.every((cat) =>
    Object.values(cat || {})?.every((arr) => arr?.length === 0)
  );

const initialState = {
  lab: {},
  radiology: {},
  procedure: {},
};

const BahmniOrderPage = () => {
  const theme = useTheme();
  const [selectedCategory, setSelectedCategory] = useState("");
  const [subCategories, setSubCategories] = useState([]);
  const [selectedSubCategory, setSelectedSubCategory] = useState("");
  const [selectedTestsMap, setSelectedTestsMap] = useState(initialState);
  const [selectedPanels, setSelectedPanels] = useState([]);
  const [submitted, setSubmitted] = useState(false);
  const [cardNumber, setCardNumber] = useState("");
  const [cardNumberError, setCardNumberError] = useState("");
  const [isFetching, setIsFetching] = useState(false);
  const [patientName, setPatientName] = useState("");
  const [loadingSubmit, setLoadingSubmit] = useState(false);
  const [rows, setRows] = useState([]);
  const [services, setServicsData] = useState({});
  const [labPanels, setLabPanels] = useState({});
  const [refresh, setRefresh] = useState(true);
  const [labPanelsMother, setLabPanelsMother] = useState({});
  const [isPanelSelected, setIsPanelSelected] = useState({});
  const [loading, setLoading] = useState(false);
  const [panelsFor, setPanelsFor] = useState([]);

  // Define checkbox color based on theme mode
  const checkboxColor =
    theme?.palette?.mode === "light"
      ? theme?.palette?.primary.main
      : theme?.palette?.secondary.main;

  const filteredPanels = Object.entries(labPanels || {})?.reduce(
    (acc, [shortCode, tests]) => {
      if (labPanelsMother?.[shortCode] === selectedSubCategory) {
        acc[shortCode] = tests;
      }
      return acc;
    },
    {}
  );

  // Set default selectedCategory when services changes
  useEffect(() => {
    const serviceKeys = Object.keys(services || {});
    if (serviceKeys?.length > 0) {
      setSelectedCategory((prev) =>
        serviceKeys?.includes(prev) ? prev : serviceKeys?.[0]
      );
    }
  }, [services]);

  //extract Services UseEffect
  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.get("/Lookup/payment-purpose");

        if (res?.status === 200) {
          const rows = await res?.data;
          const structuredMockData = transformPaymentDataToServices(rows);
          const { labPanels, labPanelsMother, categoriesWithPanels } =
            extractLabPanels(rows);

          setPanelsFor(categoriesWithPanels);
          setServicsData(structuredMockData);
          setLabPanels(labPanels);
          setLabPanelsMother(labPanelsMother);
        }
      } catch (error) {
        console.error("This is fetch Services Data: ", error);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    const subs = Object.keys(services?.[selectedCategory] || {});
    setSubCategories(subs);
    setSelectedSubCategory(subs[0]);
  }, [selectedCategory, services]);

  const fetchPatientNames = async () => {
    try {
      if (!cardNumber) return;
      if (!!patientName || !!cardNumberError) return;

      setIsFetching(true);

      const fullName = await fetchPatientName(cardNumber);

      if (fullName) {
        setPatientName(fullName);
      } else {
        toast.error("Card Number Not Registered.");
        setPatientName("");
      }
    } catch (err) {
      console.error("This is fetchPatientNames Error: ", err);
      toast.error("Error", err?.response?.data?.msg);
      setPatientName("");
    } finally {
      setIsFetching(false);
    }
  };

  const handlMRNChange = (e) => {
    setCardNumber(e?.target?.value || "");
    setPatientName("");
    mrnCheck(e?.target?.value || "");
  };

  const mrnCheck = (value) => {
    try {
      const valid = /^[0-9a-zA-Z\s\_\-]{5,}$/.test(value);
      if (!valid && value?.length > 0) {
        setCardNumberError("Please enter valid MRN (5+ digits).");
      } else {
        setCardNumberError("");
      }
    } catch (error) {
      console.error("This is mrnCheck Error: ", error);
    }
  };

  const handleTestToggle = (test, checked) => {
    try {
      // Get all selected panels where value === true
      const selectedPanels = Object.entries(isPanelSelected || {})
        ?.filter(([_, isSelected]) => isSelected)
        ?.map(([panelKey]) => panelKey);

      // Collect all tests under selected panels
      const testsUnderSelectedPanels = selectedPanels?.flatMap(
        (panelKey) => labPanels?.[panelKey] || []
      );

      const isTestInSelectedPanel = testsUnderSelectedPanels?.some((item) =>
        item?.purpose?.includes(test?.purpose)
      );

      // Prevent unselecting if the test is in an active panel
      if (!checked && isTestInSelectedPanel) {
        console.warn(
          `Cannot unselect "${test}" because it's part of a selected panel.`
        );
        return;
      }

      // Proceed with toggle
      setSelectedTestsMap((prev) => {
        const current = prev?.[selectedCategory]?.[selectedSubCategory] || [];

        const updated = checked
          ? current?.some((item) => item?.purpose?.includes(test?.purpose))
            ? current
            : [...current, test]
          : current.filter((t) => t?.purpose !== test?.purpose);

        return {
          ...prev,
          [selectedCategory]: {
            ...prev?.[selectedCategory],
            [selectedSubCategory]: updated,
          },
        };
      });
    } catch (error) {
      console.error("This is handleTestToggle Error:", error);
    }
  };

  const handlePanelToggle = (panel, e) => {
    try {
      const isChecked = e.target?.checked;

      // 1. Update panel selection state
      setIsPanelSelected((prev) => ({
        ...(prev || {}),
        [panel]: isChecked,
      }));

      // 2. Update selectedPanels list
      setSelectedPanels((prev) => {
        const isAlreadySelected = prev?.includes(panel);
        return isAlreadySelected
          ? prev.filter((p) => p !== panel)
          : [...prev, panel];
      });

      // 3. Update current subcategory
      const theKeyName = labPanelsMother?.[panel];
      setSelectedSubCategory(theKeyName);

      const tests = labPanels?.[panel] || [];

      if (isChecked) {
        // If panel is checked, add its tests
        tests.forEach((test) => handleTestToggle(test, true));
      } else {
        // If panel is unchecked, remove its tests
        setSelectedTestsMap((prev) => {
          const current = prev?.[selectedCategory]?.[theKeyName] || [];

          // Remove tests belonging to this panel
          const updated = current?.filter((t) => !tests?.includes(t));

          return {
            ...prev,
            [selectedCategory]: {
              ...prev[selectedCategory],
              [theKeyName]: updated,
            },
          };
        });
      }
    } catch (error) {
      console.error("This is handlePanelToggle Error:", error);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await api.get("/Request/doctor/get-request");
      const value =
        response?.data?.data?.value?.filter(
          (item) => item?.requestedDepartment?.toLowerCase() !== "pharmacy"
        ) || [];

      value?.sort((a, b) => new Date(b.createdOn) - new Date(a.createdOn));
      let counter = 1;
      const datagrid = value?.flatMap((item) => [
        {
          id: counter++,
          cardNumber: item.patientCardNumber,
          patientName: [
            item.patientFirstName,
            item.patientMiddleName,
            item.patientLastName,
          ]
            .filter(Boolean)
            .join(" "),
          category: item.requestedDepartment,
          createdOn: new Date(item.createdOn).toISOString().split("T")[0],
          tests: (item.requestedItems || []).flatMap(
            (entry) => entry.requestedServices || []
          ),
        },
      ]);
      setRows(datagrid || []);
    } catch (error) {
      console.error("The error of Fetching Data grid data is:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [refresh]);

  const handleSubmit = async () => {
    try {
      setLoadingSubmit(true);
      const tests = [];
      if (cardNumber?.length <= 0) {
        toast.error("Please Insert Card Number.");
        setCardNumberError("Please Fill This Field.");
        return;
      }

      if (!!cardNumberError) {
        toast?.error("Please fix the error first.");
        return;
      }

      Object.entries(selectedTestsMap || {})?.forEach(([category, subMap]) => {
        Object.entries(subMap || {})?.forEach(([subCategory, testList]) => {
          testList?.forEach((test) => {
            tests.push({ category, subCategory, test });
          });
        });
      });

      if (tests?.length === 0) {
        toast.error("Please select at least one test.");
        setLoadingSubmit(false);
        return;
      }

      const groupedOrders = {};
      tests?.forEach(({ category, subCategory, test }) => {
        if (!groupedOrders[category]) groupedOrders[category] = {};
        if (!groupedOrders[category][subCategory])
          groupedOrders[category][subCategory] = [];
        groupedOrders[category][subCategory].push({
          prodedures: test?.purpose,
          price: test?.price,
        });
      });

      const orders = Object.entries(groupedOrders || {})?.flatMap(
        ([reqestedTo, subCats]) =>
          Object.entries(subCats || {})?.map(([catagory, requestItems]) => ({
            reqestedTo,
            catagory,
            requestItems,
          }))
      );

      const payload = {
        patientCardnumber: cardNumber,
        orders,
      };

      const resp = await api.post("/Request/doctor/order-request/lab", payload);
      if (resp?.status === 200 || resp?.status === 201) {
        toast.success(resp?.data?.msg || "Orders submitted successfully!");
        setCardNumber("");
        setPatientName("");
        setRefresh((prev) => !prev);
        handleReset();
      }
    } catch (error) {
      console.error("error", error);
      const msg = error?.response?.data?.errorDescription
        ?.toLowerCase()
        .includes("patie")
        ? error?.response?.data?.errorDescription
        : error?.response?.data?.msg;
      toast.error(msg || "An error occurred while submitting orders.");
    } finally {
      setLoadingSubmit(false);
    }
  };

  const handleReset = () => {
    setSelectedTestsMap(initialState);
    setSelectedPanels([]);
    setSubmitted(false);
    setCardNumberError("");
    setCardNumber("");
    setPatientName("");
  };

  const currentTests =
    selectedTestsMap?.[selectedCategory]?.[selectedSubCategory] || [];

  const columns = [
    { field: "id", headerName: "ID", width: 90 },
    { field: "cardNumber", headerName: "Card Number", flex: 1 },
    { field: "patientName", headerName: "Patient Name", flex: 1 },
    { field: "category", headerName: "Category", flex: 1 },
    {
      field: "tests",
      headerName: "Tests",
      flex: 2,
      valueGetter: (params) => {
        return Array.isArray(params) ? params.join(", ") : params;
      },
    },
    { field: "createdOn", headerName: "Date", flex: 1 },
  ];

  return (
    <Box
      mx="auto"
      marginInline="15px"
      p={4}
      sx={{
        borderRadius: 2,
        backgroundColor:
          theme.palette.mode === "dark"
            ? "#3b89db1f" //"#7e7b7b54"
            : "#eeeeeeb0",
        color: theme.palette.text.primary,
        boxShadow: theme.shadows[3],
        transition: "all 0.3s ease", // smooth transition when theme changes
      }}
    >
      <Typography variant="h3" fontWeight={700} textAlign="center">
        Send Request
      </Typography>
      <Typography>Welcome Dr. {tokenvalue?.name}</Typography>

      <Grid container spacing={3} mt={2}>
        <Grid item xs={12} md={6}>
          <TextField
            label="Patient Card Number"
            value={cardNumber}
            onChange={handlMRNChange}
            onBlur={() => fetchPatientNames()}
            fullWidth
            error={!!cardNumberError}
            helperText={cardNumberError}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  {isFetching && <CircularProgress size={24} color="inherit" />}
                </InputAdornment>
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
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            label="Patient Name"
            value={patientName}
            disabled
            fullWidth
          />
        </Grid>
      </Grid>

      <Box mt={4}>
        {selectedCategory && (
          <Tabs
            value={selectedCategory}
            onChange={(e, val) => setSelectedCategory(val)}
            variant="fullWidth"
            indicatorColor={
              theme.palette.mode === "dark" ? "secondary" : "primary"
            }
          >
            {Object.keys(services || {}).map((cat) => (
              <Tab
                key={cat}
                value={cat}
                label={
                  <Stack direction="row" alignItems="center" spacing={1}>
                    {getCategoryIcon(cat)} &nbsp;&nbsp;
                    {cat}
                  </Stack>
                }
                sx={(theme) => ({
                  color: theme.palette.text.secondary,
                  "&.Mui-selected": {
                    color: "#6870fa",
                    fontWeight: 600,
                  },
                })}
              />
            ))}
          </Tabs>
        )}
      </Box>

      <Grid container spacing={4} mt={2}>
        <Grid item xs={12} md={3}>
          <List
            sx={{
              backgroundColor:
                theme.palette.mode === "dark" ? "#141b2d" : "#adadad3b",
            }}
          >
            {subCategories.map((sub) => {
              const isSelected = sub === selectedSubCategory;

              // #141b2d   #adadad3b #6870fa
              return (
                <ListItem
                  key={sub}
                  button
                  selected={isSelected}
                  onClick={() => setSelectedSubCategory(sub)}
                  sx={{
                    ...(isSelected && {
                      backgroundColor:
                        theme.palette.mode === "dark" ? "#e3e3e31c" : "#e3e3e3",
                      color: "#6870fa",
                    }),
                    "&.Mui-selected": {
                      backgroundColor:
                        theme.palette.mode === "dark" ? "#e3e3e31c" : "#e3e3e3",
                    },
                    "&:hover": {
                      backgroundColor:
                        theme.palette.mode === "dark" ? "#e3e3e31c" : "#e3e3e3",
                      color: "#6870fa",
                    },
                  }}
                >
                  <ListItemText primary={sub} />
                </ListItem>
              );
            })}
          </List>
        </Grid>

        <Grid item xs={12} md={9}>
          <Paper
            sx={{
              p: 3,
              backgroundColor: theme.palette.mode === "dark" && "#141b2d",
            }}
          >
            <Typography variant="h5" fontWeight={700} gutterBottom>
              {selectedSubCategory} Test Selection
            </Typography>
            {panelsFor?.some(
              (each) => each?.toLowerCase() === selectedCategory?.toLowerCase()
            ) &&
              Object.values(labPanelsMother || {})
                ?.map((item) => item?.toLowerCase())
                ?.includes(selectedSubCategory?.toLocaleLowerCase()) && (
                <Box mt={3} sx={{ marginBottom: "50px" }}>
                  <Typography variant="h6" fontWeight={700} gutterBottom>
                    {selectedCategory?.charAt(0)?.toUpperCase() +
                      selectedCategory?.slice(1)}{" "}
                    Panels
                  </Typography>
                  <Divider sx={{ mb: 3 }} />

                  <Stack direction="row" spacing={2}>
                    {Object.keys(filteredPanels).map((panel, index) => (
                      <FormControlLabel
                        key={panel}
                        control={
                          <Checkbox
                            key={index}
                            label={panel}
                            checked={selectedPanels.includes(panel)}
                            sx={{
                              color: checkboxColor,
                              "&.Mui-checked": {
                                color: checkboxColor,
                              },
                            }}
                            onChange={(e) => handlePanelToggle(panel, e)}
                          />
                        }
                        label={panel}
                      />
                    ))}
                  </Stack>
                </Box>
              )}
            <Divider sx={{ mb: 3 }} />
            <Grid container spacing={3}>
              {services?.[selectedCategory]?.[selectedSubCategory]?.map(
                (test) => {
                  const checked = currentTests.some(
                    (t) =>
                      t?.purpose?.toLowerCase?.() ===
                      test?.purpose?.toLowerCase?.()
                  );

                  return (
                    <Grid item xs={12} sm={6} md={4} key={test?.purpose}>
                      <Tooltip
                        title={checked ? "Deselect test" : "Select test"}
                        arrow
                      >
                        <Paper
                          onClick={() => handleTestToggle(test, !checked)}
                          sx={(theme) => ({
                            display: "flex",
                            alignItems: "center",
                            p: 2,
                            borderRadius: 3,
                            cursor: "pointer",
                            border: checked
                              ? `2px solid ${theme.palette.primary.main}`
                              : `1px solid ${theme.palette.divider}`,
                            "&:hover": {
                              borderColor: theme.palette.primary.light,
                            },
                          })}
                        >
                          <Checkbox
                            checked={checked}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) =>
                              handleTestToggle(test, e.target.checked)
                            }
                            sx={{
                              color: checkboxColor,
                              "&.Mui-checked": {
                                color: checkboxColor,
                              },
                            }}
                          />
                          <Typography ml={1}>{test?.purpose}</Typography>
                        </Paper>
                      </Tooltip>
                    </Grid>
                  );
                }
              )}
            </Grid>
          </Paper>
        </Grid>
      </Grid>

      <Box textAlign="center" mt={5}>
        <Stack direction="row" spacing={3} justifyContent="center">
          <Button
            variant="contained"
            color={theme.palette.mode === "dark" ? "success" : "primary"}
            onClick={() => handleSubmit()}
            disabled={loadingSubmit || isAllEmpty(selectedTestsMap)}
            startIcon={
              loadingSubmit && <CircularProgress size={20} color="inherit" />
            }
          >
            Submit Orders
          </Button>
          <Button variant="outlined" onClick={handleReset} color="error">
            Cancel / Reset
          </Button>
        </Stack>
      </Box>

      <Snackbar
        open={submitted}
        autoHideDuration={3000}
        onClose={() => setSubmitted(false)}
      >
        <Alert onClose={() => setSubmitted(false)} severity="success">
          Orders submitted successfully!
        </Alert>
      </Snackbar>

      <Box mt={5}>
        <Typography variant="h6" fontWeight={700} gutterBottom>
          Recently Sent Tests
        </Typography>
        <DataGrid
          rows={rows}
          columns={columns}
          loading={loading}
          autoHeight
          sx={{ minWidth: 320 }}
        />
      </Box>

      <ToastContainer />
    </Box>
  );
};

export default BahmniOrderPage;
