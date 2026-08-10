"use client";
import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { setHeaderData } from "@/redux/header";

export function HeaderUpdater({ title }: Readonly<{ title: string }>) {
  const dispatch = useDispatch();
  useEffect(() => {
    dispatch(setHeaderData({ title }));
  }, [title, dispatch]);
  return null;
}
