export function pointsForAnswer(answer, isCorrect) {
  if (answer === "unsure") return 1;
  return isCorrect ? 10 : 2;
}

export function levelFromScore(score) {
  return Math.max(1, Math.floor(score / 100) + 1);
}

export function accuracyRate(correctVotes, totalVotes) {
  if (!totalVotes) return 0;
  return Math.round((correctVotes / totalVotes) * 100);
}

export function computeBadges(user) {
  const badges = new Set(user.badges || []);
  if (user.totalVotes >= 1) badges.add("First Vote");
  if (user.totalVotes < 10) badges.add("New User");
  if (user.totalVotes >= 20 && user.accuracyRate >= 80) badges.add("Sharp eyes");
  if (user.reputationScore >= 200) badges.add("Cyber Guardian");
  if (user.totalVotes >= 50) badges.add("50 Votes");
  return Array.from(badges);
}

