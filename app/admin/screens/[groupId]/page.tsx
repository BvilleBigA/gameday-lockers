import { redirect } from "next/navigation";

type Props = { params: Promise<{ groupId: string }> };

export default async function LegacyGroupWallRedirect({ params }: Props) {
  const { groupId } = await params;
  redirect(`/admin/groups/${groupId}`);
}
