import { Routes, Route } from "react-router-dom";
import Home from "../pages/Home";
import Login from "../pages/Login";
import Register from "../pages/Register";
import Profile from "../pages/Profile";
import Videos from "../pages/Videos";
import Search from "../pages/Search";
import Trending from "../pages/Trending";
import WatchVideo from "../pages/WatchVideo";
import UploadVideo from "../pages/UploadVideo";
import MyVideos from "../pages/MyVideos";
import WatchHistory from "../pages/WatchHistory";
import Playlists from "../pages/Playlists";
import MyPlaylists from "../pages/MyPlaylists";
import PlaylistDetails from "../pages/PlaylistDetails";
import CreatePlaylist from "../pages/CreatePlaylist";
import Subscriptions from "../pages/Subscriptions";
import Channel from "../pages/Channel";
import EditChannel from "../pages/EditChannel";
import CreatorDashboard from "../pages/CreatorDashboard";
import CreatorAnalytics from "../pages/CreatorAnalytics";
import SearchHistory from "../pages/SearchHistory";
import VideoAnalytics from "../pages/VideoAnalytics";
import NotFound from "../pages/NotFound";
import ProtectedRoute from "./ProtectedRoute";

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/videos" element={<Videos />} />
      <Route path="/search" element={<Search />} />
      <Route path="/trending" element={<Trending />} />
      <Route path="/watch/:videoId" element={<WatchVideo />} />
      <Route path="/playlists" element={<Playlists />} />
      <Route path="/playlists/:playlistId" element={<PlaylistDetails />} />
      <Route path="/channel/:username" element={<Channel />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route
        path="/upload"
        element={
          <ProtectedRoute>
            <UploadVideo />
          </ProtectedRoute>
        }
      />
      <Route
        path="/my-videos"
        element={
          <ProtectedRoute>
            <MyVideos />
          </ProtectedRoute>
        }
      />
      <Route
        path="/my-playlists"
        element={
          <ProtectedRoute>
            <MyPlaylists />
          </ProtectedRoute>
        }
      />
      <Route
        path="/create-playlist"
        element={
          <ProtectedRoute>
            <CreatePlaylist />
          </ProtectedRoute>
        }
      />
      <Route
        path="/subscriptions"
        element={
          <ProtectedRoute>
            <Subscriptions />
          </ProtectedRoute>
        }
      />
      <Route
        path="/channel/edit"
        element={
          <ProtectedRoute>
            <EditChannel />
          </ProtectedRoute>
        }
      />
      <Route
        path="/creator-dashboard"
        element={
          <ProtectedRoute>
            <CreatorDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/creator-analytics"
        element={
          <ProtectedRoute>
            <CreatorAnalytics />
          </ProtectedRoute>
        }
      />
      <Route
        path="/videos/:videoId/analytics"
        element={
          <ProtectedRoute>
            <VideoAnalytics />
          </ProtectedRoute>
        }
      />
      <Route
        path="/search-history"
        element={
          <ProtectedRoute>
            <SearchHistory />
          </ProtectedRoute>
        }
      />
      <Route
        path="/history"
        element={
          <ProtectedRoute>
            <WatchHistory />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
