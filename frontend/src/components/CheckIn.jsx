// src/components/CheckIn.jsx
import React, { useState, useRef, useCallback, useEffect } from "react";
import CameraComponent from "./Camera";
import { getUsers, markAttendance } from "../api";
import { toast } from "react-toastify";
import LoadingSpinner from "./LoadingSpinner";
import {
	normalizeLandmarks,
	calculateCosineSimilarity,
} from "../utils/faceRecognition";

const CheckIn = ({ onMarkAttendance, onCancel }) => {
	const [users, setUsers] = useState([]);
	const [isLoading, setIsLoading] = useState(true);
	const [matchedUser, setMatchedUser] = useState(null);
	const [isSubmitting, setIsSubmitting] = useState(false);

	const cameraRef = useRef(null);

	// Fetch all users on component mount
	useEffect(() => {
		const fetchUsers = async () => {
			try {
				const response = await getUsers();
				setUsers(response.data);
				console.log("Fetched users:", response.data);
			} catch (error) {
				console.error("Error fetching users:", error);
				toast.error("Failed to fetch users.");
			} finally {
				setIsLoading(false);
			}
		};
		fetchUsers();
	}, []);

	// Callback to handle detected face landmarks
	const handleFaceDetected = useCallback(
		(landmarks) => {
			if (!landmarks) {
				setMatchedUser(null);
				return;
			}

			// Normalize detected landmarks
			const normalizedDetectedLandmarks = normalizeLandmarks(landmarks);

			const threshold = 0.2; // Adjust based on empirical testing
			let bestMatch = null;
			let highestSimilarity = -Infinity;

			users.forEach((user) => {
				// Normalize stored user landmarks
				const normalizedUserLandmarks = normalizeLandmarks(
					user.faceData
				);

				const similarity = calculateCosineSimilarity(
					normalizedUserLandmarks,
					normalizedDetectedLandmarks
				);

				if (similarity > highestSimilarity && similarity >= threshold) {
					highestSimilarity = similarity;
					bestMatch = user;
				}
			});

			if (bestMatch) {
				setMatchedUser(bestMatch);
				console.log(
					`Matched with user: ${
						bestMatch.name
					} (Similarity: ${highestSimilarity.toFixed(2)})`
				);
			} else {
				setMatchedUser(null);
				console.log("No matching user found.");
			}
		},
		[users]
	);

	const handleConfirmAttendance = async () => {
		if (!matchedUser) {
			toast.error("No user matched for attendance.");
			return;
		}

		setIsSubmitting(true);
		try {
			await markAttendance(matchedUser._id);
			toast.success(`Attendance marked for ${matchedUser.name}!`);
			console.log(`Attendance marked for user: ${matchedUser.name}`);
			// Refresh attendance records by calling onMarkAttendance if needed
			onMarkAttendance();
			setMatchedUser(null); // Reset matched user after marking attendance
		} catch (error) {
			console.error("Error marking attendance:", error);
			toast.error("Failed to mark attendance.");
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<div className="w-full max-w-md bg-white shadow-md rounded-lg p-6 mx-auto">
			<h2 className="text-xl font-semibold mb-4 text-gray-700">
				Attendance Check-In
			</h2>
			{isLoading ? (
				<LoadingSpinner />
			) : (
				<>
					<CameraComponent
						ref={cameraRef}
						onFaceDetected={handleFaceDetected}
					/>
					{matchedUser ? (
						<div className="mt-4 p-4 bg-green-100 border border-green-400 rounded-md">
							<p className="text-green-800">
								Welcome, <strong>{matchedUser.name}</strong>!
							</p>
							<button
								type="button"
								onClick={handleConfirmAttendance}
								className={`mt-2 w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 transition duration-200 ${
									isSubmitting
										? "opacity-50 cursor-not-allowed"
										: ""
								}`}
								disabled={isSubmitting}
							>
								{isSubmitting
									? "Marking Attendance..."
									: "Confirm Attendance"}
							</button>
						</div>
					) : (
						<div className="p-3 bg-red-100 border border-red-400 rounded flex items-center justify-center text-red-800 text-sm">
							No matching user detected. Place your face properly.{" "}
						</div>
					)}
					<button
						type="button"
						onClick={onCancel}
						className=" mt-3 w-full bg-gray-500 text-white py-2 px-4 rounded-md hover:bg-gray-600 transition duration-200"
					>
						Cancel
					</button>
				</>
			)}
		</div>
	);
};

export default CheckIn;
