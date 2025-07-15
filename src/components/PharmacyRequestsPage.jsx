import React, { useState } from "react";
import { Box, Button, Typography, useTheme, Stack, Paper } from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import dayjs from "dayjs";
import api from "../utils/api";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import EtDatePicker from "mui-ethiopian-datepicker";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { renderETDateAtCell } from "./PatientSearch";
import { getTokenValue } from "../services/user_service";

const tokenValue = getTokenValue();

const PharmacyRequestsPage = () => {
  const theme = useTheme();
  const [startDate, setStartDate] = useState(dayjs().startOf("day")?.$d);
  const [endDate, setEndDate] = useState(dayjs().endOf("day")?.$d);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const requestedto = tokenValue?.UserType?.toLowerCase()?.includes("mlt")
        ? "Lab"
        : tokenValue?.UserType;
      const response = await api.put("/Request/doctor/rpt-get-request", {
        start: startDate,
        end: endDate,
        requestedto: requestedto || "-",
      });

      const data = response.data?.data?.value || [];

      const filtered = data.filter(
        (item) =>
          item.requestedDepartment?.toLowerCase() === requestedto?.toLowerCase()
      );

      const formattedRows = filtered.map((item, index) => ({
        id: index + 1,
        cardNumber: item.patientCardNumber,
        fullName: `${item.patientFirstName} ${item.patientMiddleName} ${item.patientLastName}`,
        gender: item.patientGender,
        department: item.requestingDepartment,
        createdOn: dayjs(item.createdOn).format("YYYY-MM-DD HH:mm"),
        requestedBy: item.requestedBy,
        services: item.requestedItems
          .map((i) => i.requestedServices)
          .join(", "),
      }));

      const sortedData = formattedRows?.sort(
        (a, b) => a.createdOn - b.createdOn
      );
      setRows(sortedData);
    } catch (err) {
      toast.error(
        err.response?.data?.msg || "Something went wrong while fetching data."
      );
      console.error("This is fetchData Error : ", err);
    } finally {
      setLoading(false);
    }
  };

  const exportToExcel = async () => {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Doctor Requests");

      const formattedStart = dayjs(startDate).format("YYYY-MM-DD");
      const formattedEnd = dayjs(endDate).format("YYYY-MM-DD");

      // Define columns explicitly with headers
      const columns = [
        { header: "Card Number", key: "cardNumber", width: 15 },
        { header: "Full Name", key: "fullName", width: 30 },
        { header: "Gender", key: "gender", width: 10 },
        { header: "Requesting Department", key: "department", width: 20 },
        { header: "Requested Services", key: "services", width: 40 },
        { header: "Requested By", key: "requestedBy", width: 20 },
        {
          header: "Created On",
          key: "createdOn",
          width: 20,
          renderCell: (params) => renderETDateAtCell(params?.row?.createdOn),
        },
      ];

      worksheet.columns = columns;

      // Row 1: Hospital Title (Dynamic, Styled)
      worksheet.mergeCells("A1:G1");
      const hospitalTitle = worksheet.getCell("A1");
      hospitalTitle.value = `${tokenValue?.Hospital} - Doctor Requests Report`;
      hospitalTitle.font = {
        bold: true,
        size: 16,
        color: { argb: "FF003366" },
      };
      hospitalTitle.alignment = { vertical: "middle", horizontal: "center" };
      hospitalTitle.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFDEEAF6" },
      };
      hospitalTitle.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };

      // Row 2: Date Range
      worksheet.mergeCells("A2:G2");
      const dateRange = worksheet.getCell("A2");
      dateRange.value = `Report Period: ${renderETDateAtCell(
        formattedStart
      )} to ${renderETDateAtCell(formattedEnd)}`;
      dateRange.font = { italic: true, size: 12 };
      dateRange.alignment = { vertical: "middle", horizontal: "center" };

      // Manually insert headers to row 3 with styling
      const headerRow = worksheet.getRow(3);
      columns.forEach((col, i) => {
        const cell = headerRow.getCell(i + 1);
        cell.value = col.header;
        cell.font = { bold: true };
        cell.alignment = {
          horizontal: "center",
          vertical: "middle",
          wrapText: true,
        };
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFDDEEFF" },
        };
        cell.border = {
          top: { style: "thin" },
          bottom: { style: "thin" },
          left: { style: "thin" },
          right: { style: "thin" },
        };
      });
      headerRow.commit();

      const sortedRows = [...rows].sort((a, b) => {
        return new Date(a.createdOn) - new Date(b.createdOn);
      });

      // Add data rows (starting from row 4)
      sortedRows.forEach((rowData) => {
        const processedData = {
          ...rowData,
          createdOn: renderETDateAtCell(rowData?.createdOn),
        };

        const excelRow = worksheet.addRow(processedData);
        const isFailed = processedData.services
          ?.toLowerCase()
          .includes("failed");

        excelRow.eachCell((cell) => {
          cell.border = {
            top: { style: "thin" },
            bottom: { style: "thin" },
            left: { style: "thin" },
            right: { style: "thin" },
          };
          if (isFailed) {
            cell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "FFFFCCCC" }, // Light red background
            };
          }
        });
      });

      // Footer row for total count
      const totalRow = worksheet.addRow([]);
      totalRow.getCell(1).value = `Total Requests: ${rows.length}`;
      totalRow.getCell(1).font = { bold: true };
      worksheet.mergeCells(`A${totalRow.number}:G${totalRow.number}`);
      totalRow.alignment = { horizontal: "left" };

      // Freeze rows: title + date + headers
      worksheet.views = [{ state: "frozen", ySplit: 3 }];

      const buffer = await workbook.xlsx.writeBuffer();
      saveAs(
        new Blob([buffer]),
        `DoctorRequests_${renderETDateAtCell(
          formattedStart
        )}_to_${renderETDateAtCell(formattedEnd)}.xlsx`
      );
    } catch (error) {
      console.error("This is exportToExcel Error : ", error);
    }
  };

  const columns = [
    { field: "cardNumber", headerName: "Card Number", flex: 1 },
    { field: "fullName", headerName: "Patient Name", flex: 2 },
    { field: "gender", headerName: "Gender", flex: 1 },
    { field: "services", headerName: "Services", flex: 2.5 },
    { field: "requestedBy", headerName: "Requested By", flex: 1 },
    {
      field: "department",
      headerName: "Requesting Department",
      flex: 1.5,
    },
    {
      field: "createdOn",
      headerName: "Created On",
      flex: 1.5,
      renderCell: (params) =>
        renderETDateAtCell(params?.row?.createdOn || "1995-01-01"),
    },
  ];

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom fontWeight={600}>
        Doctor Request Viewer
      </Typography>

      <Paper
        elevation={3}
        sx={{
          p: 2,
          mb: 2,
          backgroundColor:
            theme.palette.mode === "dark"
              ? "#12121200"
              : theme.palette.background.paper,
          borderRadius: 2,
        }}
      >
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={2}
          alignItems="center"
        >
          <EtDatePicker
            key={startDate || "startDate"}
            label="Start Date"
            value={startDate ? new Date(startDate) : null}
            onChange={(newValue) => setStartDate(newValue)}
            required
          />

          <EtDatePicker
            key={endDate || "endDate"}
            label="End Date"
            value={endDate ? new Date(endDate) : null}
            onChange={(newValue) => setEndDate(newValue)}
            required
          />

          <Button
            variant="contained"
            onClick={fetchData}
            disabled={loading}
            color={theme.palette.mode === "dark" ? "secondary" : "primary"}
            sx={{ minWidth: 120, backgroundColor: "#2e8ac9" }}
          >
            {loading ? "Loading..." : "Search"}
          </Button>
          <Button
            variant="outlined"
            color="success"
            onClick={exportToExcel}
            disabled={!rows.length}
          >
            Export to Excel
          </Button>
        </Stack>
      </Paper>

      <Paper elevation={1}>
        <DataGrid
          rows={rows}
          columns={columns}
          loading={loading}
          autoHeight
          sx={{
            minWidth: 320,
            "& .MuiDataGrid-columnHeaders": {
              backgroundColor: theme.palette.primary.light,
              fontWeight: "bold",
            },
            "& .MuiDataGrid-cell": {
              whiteSpace: "normal",
              wordBreak: "break-word",
            },
          }}
        />
      </Paper>
      <ToastContainer />
    </Box>
  );
};

export default PharmacyRequestsPage;
