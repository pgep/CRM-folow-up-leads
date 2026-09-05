export interface FinancialContract {
  id: string;
  lead_id: string;
  contract_number: string;
  contract_date: string;
  total_value: number;
  freight_value?: number;
  discount_value?: number;
  final_value?: number;
  payment_method: "a_vista" | "parcelado";
  installments_count: number;
  down_payment: number;
  status: "active" | "completed";
  observations: string;
  created_at: string;
  updated_at: string;
}

export interface FinancialInstallment {
  id: string;
  contract_id: string;
  installment_number: number;
  due_date: string;
  value: number;
  status: "pending" | "paid";
  paid_date: string | null;
  paid_value: number | null;
  payment_method: string | null;
  payment_observations: string | null;
  receipt_number: string | null;
  created_at: string;
  updated_at: string;
}

export type FinancialQuickFilter = "all" | "pending" | "overdue" | "paid" | "next7";
export type FinancialViewTab = "installments" | "contracts";
