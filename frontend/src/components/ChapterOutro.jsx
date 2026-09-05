import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, RotateCcw } from "lucide-react";
import { useFestivalClaim } from "../hooks/useFestivalClaim";
import { FestivalPrize, FestivalWon } from "./FestivalPrize";
import { CHAPTERS, allComplete, completedChapters, markComplete, nextChapter } from "../lib/utsav";

// What happens at the end of any chapter. Shared so the three games cannot
// drift into telling visitors different things about the same code.
//
// The code is claimable only once all three chapters are done. Until then the
// outro's job is to name what is left and open the door to it, because a dead
// end here is where a player leaves.

export default function ChapterOutro({ chapterId, headline, scoreLine, detail, onReplay, returnPath }) {
  const { user, offer, claiming, error, reveal, claim, recordWin, loginPath } =
    useFestivalClaim({ label: chapterId, returnPath });
  const [done, setDone] = useState(false);
  const [next, setNext] = useState(null);
  // Counted after this chapter is recorded, so it says what is genuinely left.
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    markComplete(chapterId);
    const complete = allComplete();
    setDone(complete);
    setNext(complete ? null : nextChapter());
    setRemaining(CHAPTERS.length - completedChapters().length);
    if (complete) recordWin();
  }, [chapterId, recordWin]);

  const total = CHAPTERS.length;

  const shareUrl = typeof window !== "undefined" ? `${window.location.origin}/utsav` : "https://evolvixtech.in/utsav";
  const shareText = "I played the Evolvix Puja games and won a discount. See what you get.";

  return (
    <>
      <div className="utv-card utv-card--score" data-testid={`${chapterId}-score`}>
        <h2>{headline}</h2>
        {scoreLine && <p className="utv-score">{scoreLine}</p>}
        {detail && <p className="utv-lede">{detail}</p>}
        <button className="utv-secondary" onClick={onReplay} data-testid={`${chapterId}-again`}>
          <RotateCcw size={15} /> Play it again
        </button>
      </div>

      {!done && next && (
        <div className="utv-card utv-card--next" data-testid="utsav-next-chapter">
          <span className="utv-bloom" aria-hidden="true">{next.emoji}</span>
          <p className="utv-prize-label">Chapter unlocked</p>
          <h2>{next.title}</h2>
          <p className="utv-lede">{next.blurb}</p>
          <p className="utv-hub-note">
            Finish all {total} and the discount is yours — {remaining === 1 ? "one" : remaining} to go.
          </p>
          <Link to={next.path} className="utv-primary" data-testid="utsav-next-link">
            Play it now <ArrowRight size={17} />
          </Link>
        </div>
      )}

      {done && !offer && (
        <FestivalWon
          claim={claim}
          claiming={claiming}
          error={error}
          user={user}
          loginPath={loginPath}
          headline="All three done — your gift is wrapped"
          lede={
            <>
              Durga Puja, Diwali and Chhath, all played. The code is worth somewhere
              between <strong>15% and 40% off</strong> anything we make, it lasts the
              whole season, and it is yours whatever your scores were.
            </>
          }
        />
      )}

      {offer && <FestivalPrize offer={offer} reveal={reveal} shareText={shareText} shareUrl={shareUrl} />}
    </>
  );
}
