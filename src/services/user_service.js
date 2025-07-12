import api from "../utils/api";
import { jwtDecode } from "jwt-decode";

const tokenName = ".otc";

export async function login(payload) {
  const response = await api.put("/Account/Login", {
    username: payload.username,
    password: payload.password,
  });
  return { ...response.data };
}

export function logout() {
  localStorage.removeItem(tokenName);
  localStorage.removeItem("currentNav");
  localStorage.removeItem("lang");
  return (window.location.href = window.location.origin + "/login");
}

export function getUser() {
  try {
    const session = localStorage.getItem(tokenName);
    return session;
  } catch (error) {
    return null;
  }
}

export function getSession() {
  try {
    const token = localStorage.getItem(tokenName);
    if (!token) return null;

    return token;
  } catch (error) {
    console.error("This is getSession Error: ", error);
    return null;
  }
}

export function getTokenValue() {
  try {
    const token = localStorage.getItem(tokenName);
    if (!token) {
      return null;
    }

    const decoded = jwtDecode(token);

    return decoded;
  } catch (error) {
    console.error("This is jwtDecode Error: ", error);
    return null;
  }
}

export function checkAuthLoader() {
  try {
    const session = getSession();

    if (!session) {
      localStorage.removeItem(tokenName);
      return (window.location.href = window.location.origin + "/login");
    }
  } catch (error) {
    console.error("This is checkAuthLoader Error: ", error);
    return;
  }
}

export const fetchPatientName = async (cardNumber) => {
  try {
    if (!cardNumber) return "";

    const response = await api.put(
      "/Patient/get-one-patient-info",
      {
        patientCardNumber: `${cardNumber}`,
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    const patient = response?.data?.data?.value[0];

    if (!patient) {
      console.warn("No patient data found for card number:", cardNumber);
      return "";
    }

    const fullName = [
      patient.patientFirstName,
      patient.patientMiddleName,
      patient.patientLastName,
    ]
      .filter(Boolean)
      .join(" ");

    return fullName;
  } catch (err) {
    console.error("Error fetching patient info:", err);
    return "";
  }
};
