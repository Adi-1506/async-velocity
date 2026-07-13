"use client";

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function UserIndexPage() {
  const router = useRouter();
  const params = useParams();
  const role = params?.role as string;
  const userId = params?.userId as string;

  useEffect(() => {
    if (role && userId) {
      router.replace(`/${role}/${userId}/dashboard`);
    }
  }, [role, userId, router]);

  return null;
}
