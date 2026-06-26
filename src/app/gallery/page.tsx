import { Gallery } from "@/features/Gallery";

/**
 * Gallery route — mounts the signed-in gallery manager. Gated to authenticated
 * users by the session proxy (logged-out visitors redirect to `/login`).
 */
export default function GalleryPage() {
  return <Gallery />;
}
