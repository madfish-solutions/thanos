export const serializeError = (error: unknown) => {
  if (typeof error === 'string') {
    return error;
  }

  if (error == null) {
    return error;
  }

  if (Array.isArray(error)) {
    return JSON.stringify(error);
  }

  return JSON.stringify({ ...error });
};
