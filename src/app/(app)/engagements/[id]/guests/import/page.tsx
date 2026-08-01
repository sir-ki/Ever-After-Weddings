import Link from "next/link";
import { bulkImportGuests } from "../actions";

export default async function ImportGuestsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;

  return (
    <div className="max-w-xl">
      <Link
        href={`/engagements/${id}?tab=guests`}
        className="text-sm text-neutral-500 hover:underline"
      >
        ← Guest list
      </Link>
      <h1 className="mb-2 mt-2 text-xl font-semibold text-neutral-900">
        Bulk import guests
      </h1>
      <p className="mb-6 text-sm text-neutral-500">
        One guest per line: <strong>Name, Side, Group, Contact phone</strong>.
        Side must be <code>bride</code>, <code>groom</code>, or{" "}
        <code>both</code>. Group and contact phone are optional. An optional
        header row is fine.
      </p>

      <form
        action={bulkImportGuests}
        className="space-y-4"
        encType="multipart/form-data"
      >
        <input type="hidden" name="engagement_id" value={id} />

        <div>
          <label
            htmlFor="paste"
            className="mb-1 block text-sm font-medium text-neutral-700"
          >
            Paste guest list
          </label>
          <textarea
            id="paste"
            name="paste"
            rows={10}
            placeholder={
              "Ana Reyes, Bride, Family, 0917 555 0101\nRamon Reyes, Bride, Family, 0917 555 0102"
            }
            className="w-full rounded-md border border-neutral-300 px-3 py-2 font-mono text-sm focus:border-neutral-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-3 text-sm text-neutral-500">
          <div className="h-px flex-1 bg-neutral-200" />
          or
          <div className="h-px flex-1 bg-neutral-200" />
        </div>

        <div>
          <label
            htmlFor="file"
            className="mb-1 block text-sm font-medium text-neutral-700"
          >
            Upload a CSV file
          </label>
          <input
            id="file"
            name="file"
            type="file"
            accept=".csv,text/csv,text/plain"
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
          />
        </div>

        {error && (
          <p className="whitespace-pre-wrap rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <button
          type="submit"
          className="w-full rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-800"
        >
          Import guests
        </button>
      </form>
    </div>
  );
}
