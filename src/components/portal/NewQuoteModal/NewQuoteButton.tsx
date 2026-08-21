"use client";

import { useState } from "react";
import Button from "@/components/admin/ui/Button/Button";
import NewQuoteModal from "./NewQuoteModal";

export default function NewQuoteButton({ label = "Solicitar novo orçamento" }: { label?: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="solid" type="button" onClick={() => setOpen(true)}>
        {label}
      </Button>
      {open && <NewQuoteModal onClose={() => setOpen(false)} />}
    </>
  );
}
