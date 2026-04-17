import { redirect } from "next/navigation";

type Props = { params: Promise<{ displayId: string }> };

export default async function LegacyDisplayLive({ params }: Props) {
  const { displayId } = await params;
  redirect(`/screen/${displayId}`);
}
