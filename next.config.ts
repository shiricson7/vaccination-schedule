import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 홈 폴더 등 상위 디렉터리의 lockfile을 프로젝트 루트로 오인하지 않도록 고정
  turbopack: { root: __dirname },
};

export default nextConfig;
