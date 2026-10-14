export interface PhoneProps {
  id: number;
  userName: string;
  domain: string;
  password: string;
  port: number;
  setIsUserRegistered: (isUserRegistered: boolean) => void;
  setIsSipConnected: (isSipConnected: boolean) => void;
  onClose?: () => void;
  className?: string;
}

export interface CallAlertState {
  userId: number;
  extensionId: number | string;
  sessionId: string;
  phoneNumber: string;
  direction: string;
  cause: string;
  disposition: string;
  duration: number;
  isHold: boolean;
  status: string;
  hangupBy: string;
  user_name: string;
  nci?: string;
  customerName?: string;
  block?: string;
  size?: string;
  project?: string;
  dueAmount?: number;
  dueMonth?: string;
}

export interface CallLog {
  nci: string | null;
  id: string | null;
  name: string | null;
  customer_phone: string | null;
  customer_name: string | null;
  comments: string | null;
  direction: string | null;
  disposition: string | null;
  call_time: string | null;
  duration: string | null;
  hangup_by: string | null;
  status: string | null;
  recording: string | null;
  session_id: string | null;
  project: string | null;
  due_month: string | null;
  due_amount: number | null;
  block: string | null;
  size: string | null;
}

export interface FilterOption {
  value: string;
  label: string;
}

export interface LogParams {
  page: number;
  user_id?: string;
  direction?: string;
  disposition?: string;
  start_date?: string;
  end_date?: string;
  limit: string;
  customer_name?: string;
  nci?: string;
  block?: string;
  size?: string;
  project?: string;
  due_month?: string;
}

export interface StatsParams {
  user_id?: string;
  start_date?: string;
  end_date?: string;
}

export interface StatsData {
  total_calls: number;
  answered_calls: number;
  unanswered_calls: number;
  average_wait_time: number;
  max_wait_time: number;
  answered_percentage: number;
  unanswered_percentage: number;
}

export interface ApiResponse {
  data: CallLog[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalRecords: number;
  };
}

export interface ErrorResponse {
  response: {
    data: {
      message: string;
    };
  };
}

export interface CallData {
  id: number;
  customer_phone: string;
  call_date_time: string;
  direction: string;
  disposition: string;
}
