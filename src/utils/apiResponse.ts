import { Response } from 'express';

export function success(res: Response, data: unknown, status = 200): void {
  res.status(status).json(data);
}

export function error(
  res: Response,
  message: string,
  status = 400,
  code?: string
): void {
  const payload: { error: string; code?: string } = { error: message };
  if (code) payload.code = code;
  res.status(status).json(payload);
}

export function validationError(
  res: Response,
  details: Array<{ path: string; message: string }>
): void {
  res.status(400).json({ error: 'Validation failed', details });
}
