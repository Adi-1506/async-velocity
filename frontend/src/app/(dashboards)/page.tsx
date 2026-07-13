"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAppContext } from "@/context/AppContext";

export default function RootIndexPage() {
  const router = useRouter();
  const { userProfile } = useAppContext();

  useEffect(() => {
    if (userProfile && userProfile.uuid) {
      const expectedPrefix = userProfile.role === 'admin' ? 'super-admin' : userProfile.role === 'lead' ? 'lead' : 'member';
      router.replace(`/${expectedPrefix}/${userProfile.uuid}/dashboard`);
    }
  }, [userProfile, router]);

  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-600"></div>
    </div>
  );
}
