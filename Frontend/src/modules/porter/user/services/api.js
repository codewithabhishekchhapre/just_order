import axiosInstance from '@core/api/axios';

const unwrap = (response) => response?.data?.data ?? response?.data ?? response;

const unwrapPaginated = (response) => {
  const data = unwrap(response);
  return {
    records: data.records || [],
    page: data.page || 1,
    pages: data.pages || 1,
    total: data.total || 0,
    hasNext: Boolean(data.hasNext),
    hasPrev: Boolean(data.hasPrev),
    limit: data.limit || 20,
  };
};

export const porterUserApi = {
  getPublicVehicles: async () => {
    const response = await axiosInstance.get('/porter/vehicles/public');
    return unwrap(response).vehicles || unwrap(response).vehicleTypes || [];
  },
  quote: async (body) => {
    const response = await axiosInstance.post('/porter/quote', body);
    return unwrap(response);
  },
  createTrip: async (body) => {
    const response = await axiosInstance.post('/porter/trips', body);
    return unwrap(response).trip || unwrap(response);
  },
  listTrips: async (params = {}) => {
    const response = await axiosInstance.get('/porter/trips', { params });
    return unwrapPaginated(response);
  },
  getTrip: async (id) => {
    const response = await axiosInstance.get(`/porter/trips/${id}`);
    return unwrap(response).trip;
  },
  cancelTrip: async (id, body = {}) => {
    const response = await axiosInstance.post(`/porter/trips/${id}/cancel`, body);
    return unwrap(response).trip || unwrap(response);
  },
};

export const porterPartnerApi = {
  acceptTrip: async (id) => {
    const response = await axiosInstance.post(`/porter/partner/trips/${id}/accept`);
    return unwrap(response).trip || unwrap(response);
  },
  markArrived: async (id) => {
    const response = await axiosInstance.post(`/porter/partner/trips/${id}/arrived`);
    return unwrap(response).trip || unwrap(response);
  },
  startTrip: async (id, otp) => {
    const response = await axiosInstance.post(`/porter/partner/trips/${id}/start`, { otp });
    return unwrap(response).trip || unwrap(response);
  },
  completeTrip: async (id, body = {}) => {
    const response = await axiosInstance.post(`/porter/partner/trips/${id}/complete`, body);
    return unwrap(response).trip || unwrap(response);
  },
};
