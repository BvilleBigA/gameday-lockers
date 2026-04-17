import { redirect } from "next/navigation";

type Props = { params: Promise<{ displayId: string }> };

export default async function RokuLivePage({ params }: Props) {
  const { displayId } = await params;
  redirect(`/screen/${encodeURIComponent(displayId)}`);
}
