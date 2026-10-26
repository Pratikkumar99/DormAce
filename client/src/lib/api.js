
import axios from 'axios';

export const api = axios.create({
  baseURL: `${
    import.meta.env.DEV
      ? 'http://localhost:5000'
      : import.meta.env.VITE_API_URL || ''
  }/api`,
  withCredentials: true,
  headers: {
    'X-Requested-With': 'dormace',
  },
});

const NO_REFRESH = [
  '/auth/login',
  '/auth/register',
  '/auth/refresh',
  '/auth/logout',
];

let refreshing = null;

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { config, response } = error;

    if (
      response?.status === 401 &&
      config &&
      !config._retried &&
      !NO_REFRESH.some((url) => config.url?.includes(url))
    ) {
      config._retried = true;

      refreshing ||= api
        .post('/auth/refresh')
        .finally(() => {
          refreshing = null;
        });

      try {
        await refreshing;
        return api(config);
      } catch {
        window.dispatchEvent(new Event('auth:expired'));
      }
    }

    return Promise.reject(error);
  }
);

export const errMsg = (error) =>
  error?.response?.data?.message ||
  error?.message ||
  'Something went wrong';

export const errCode = (error) =>
  error?.response?.data?.code;

export const asset = (path) => path || '';
