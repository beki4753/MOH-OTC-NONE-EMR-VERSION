import React from "react";
import { DataGrid } from "@mui/x-data-grid";
import { Box } from "@mui/material";

const MyDataGrid = ({
  height = 500,
  minWidth = 320,
  sx = {},
  columns,
  ...props
}) => {
  const DEFAULT_MIN_WIDTH = 100;

  const columnsWithMinWidth = React.useMemo(() => {
    if (!columns) return [];
    return columns.map((col) => ({
      ...col,
      minWidth: col.minWidth ?? DEFAULT_MIN_WIDTH,
      flex: col.flex ?? 1, // Responsive column sizing
    }));
  }, [columns]);

  return (
    <Box
      sx={{
        height,
        width: "100%",
        minWidth,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        ...sx,
      }}
    >
      <DataGrid
        columns={columnsWithMinWidth}
        {...props}
        sx={{
          flex: 1,
          minWidth: 0,
        }}
      />
    </Box>
  );
};

export default MyDataGrid;
