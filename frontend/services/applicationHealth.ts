// services/applicationHealth.ts
import axios from "axios"

export const getApplicationHealth = async () => {
  const res = await axios.get(
    "/api/application-health"
  );

  return res.data;
};