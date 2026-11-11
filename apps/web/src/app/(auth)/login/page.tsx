import { LoginForm } from "@/components/auth/LoginForm";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign In",
  description:
    "Sign in to Verdict — law-firm management for matters, clients, tasks, attendance, and expenses.",
  alternates: { canonical: "/login" }
};

export default function LoginPage() {
  return <LoginForm />;
}
