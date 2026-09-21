import { useOwner } from '@/owner/owner-context';
import { useParams, Link } from '@tanstack/react-router';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, Upload, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { isMediaFresh } from '@/owner/compliance';

export function OwnerMedia() {
  const { roomId } = useParams({ from: '/owner/media/$roomId' });
  const { media, uploadMedia } = useOwner();
  const existing = media.find((m) => m.roomId === roomId);
  const [photos, setPhotos] = useState<string[]>(existing?.photos ?? []);
  const [video, setVideo] = useState<string>(existing?.videoUrl ?? '');

  const fresh = isMediaFresh(existing);

  return (
    <div className="space-y-4 max-w-2xl">
      <header>
        <h1 className="font-display text-xl font-semibold">Room media · proof of vacancy</h1>
        <p className="text-sm text-muted-foreground">Vacant rooms need 3 photos + 1 video. Media expires in 7 days.</p>
        <Link to="/owner/rooms" className="text-xs text-accent">← Back to rooms</Link>
      </header>

      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium">Room {roomId}</div>
          {existing && (
            <span className={`text-[11px] inline-flex items-center gap-1 ${fresh ? 'text-success' : 'text-destructive'}`}>
              <Clock className="h-3 w-3" /> {fresh ? `Fresh · expires ${new Date(existing.expiresAt).toLocaleDateString()}` : 'Expired'}
            </span>
          )}
        </div>

        <div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Photos (3 required)</div>
          <div className="grid grid-cols-3 gap-2">
            {[0, 1, 2].map((i) => (
              <button
                key={i}
                type="button"
                onClick={() => {
                  const next = [...photos];
                  next[i] = '/placeholder.svg';
                  setPhotos(next);
                }}
                className="aspect-square rounded-md border border-dashed border-border bg-muted/30 hover:bg-muted/60 flex items-center justify-center"
              >
                {photos[i] ? (
                  <img src={photos[i]} alt="" className="w-full h-full object-cover rounded-md" />
                ) : (
                  <Camera className="h-5 w-5 text-muted-foreground" />
                )}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Video (1 required)</div>
          <button
            type="button"
            onClick={() => setVideo('https://example.com/room-video.mp4')}
            className="w-full h-24 rounded-md border border-dashed border-border bg-muted/30 hover:bg-muted/60 flex items-center justify-center text-xs text-muted-foreground gap-2"
          >
            <Upload className="h-4 w-4" /> {video ? 'Video attached · tap to replace' : 'Attach short walkthrough video'}
          </button>
        </div>

        <Button
          disabled={photos.filter(Boolean).length < 3 || !video}
          onClick={() => {
            uploadMedia(roomId, photos.filter(Boolean), video);
            toast.success('Media uploaded · 7-day countdown started');
          }}
          className="w-full"
        >
          Upload & start 7-day timer
        </Button>
      </div>
    </div>
  );
}
