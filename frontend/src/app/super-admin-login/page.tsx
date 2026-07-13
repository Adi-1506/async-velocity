"use client";
import AuthScreen from "@/components/AuthScreen";
import { useAppContext } from "@/context/AppContext";
export default function Page() { const { handleLogin, triggerToast } = useAppContext(); return <AuthScreen role="admin" onLogin={handleLogin} triggerToast={triggerToast} />; }
