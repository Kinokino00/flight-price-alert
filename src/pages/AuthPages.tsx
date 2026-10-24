import { AuthForm } from "@/components/AuthForm";
import { usePageMeta } from "@/lib/use-page-meta";

export function SignInPage() {
  usePageMeta({
    title: "Sign in — Flight Price Notifier",
    description: "Sign in to Flight Price Notifier to manage your fare alerts.",
    ogDescription: "Sign in to manage your flight fare alerts.",
  });
  return <AuthForm mode="signin" />;
}

export function SignUpPage() {
  usePageMeta({
    title: "Sign up — Flight Price Notifier",
    description: "Create a Flight Price Notifier account and get emailed when fares drop.",
    ogDescription: "Create an account to get fare-drop emails.",
  });
  return <AuthForm mode="signup" />;
}
