document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";

      // Clear and reset activity select (keep placeholder)
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        // Ensure participants is always an array
        const participants = Array.isArray(details.participants) ? details.participants : [];
        const maxParticipants = typeof details.max_participants === "number" ? details.max_participants : 0;
        const spotsLeft = Math.max(0, maxParticipants - participants.length);

        // Title
        const title = document.createElement("h4");
        title.textContent = name;

        // Description
        const desc = document.createElement("p");
        desc.textContent = details.description || "";

        // Schedule
        const scheduleP = document.createElement("p");
        const scheduleStrong = document.createElement("strong");
        scheduleStrong.textContent = "Schedule:";
        scheduleP.appendChild(scheduleStrong);
        scheduleP.append(" " + (details.schedule || "TBA"));

        // Availability
        const availP = document.createElement("p");
        const availStrong = document.createElement("strong");
        availStrong.textContent = "Availability:";
        availP.appendChild(availStrong);
        availP.append(" " + spotsLeft + " spots left");

        // Participants block
        const participantsDiv = document.createElement("div");
        participantsDiv.className = "participants";
        const participantsStrong = document.createElement("strong");
        participantsStrong.textContent = "Participants:";
        participantsDiv.appendChild(participantsStrong);

        if (participants.length === 0) {
          const noP = document.createElement("p");
          noP.className = "no-participants";
          noP.textContent = "No participants yet";
          participantsDiv.appendChild(noP);
        } else {
          const ul = document.createElement("ul");
          ul.className = "participants-list";
          participants.forEach((p) => {
            const li = document.createElement("li");
            // support participant objects like {name, email} or plain strings
            const label = (p && (p.name || p.email)) || p || "";
            li.textContent = label;

            // determine an email we can use to unregister this participant
            const participantEmail = (p && p.email) || (typeof p === "string" && p.includes("@") ? p : "");

            // attach dataset for use by the remove handler
            if (participantEmail) {
              li.dataset.email = participantEmail;
              li.dataset.activity = name;

              // remove button (trash icon)
              const removeBtn = document.createElement("button");
              removeBtn.type = "button";
              removeBtn.className = "participant-remove";
              removeBtn.title = "Unregister participant";
              removeBtn.innerHTML = "🗑️";
              li.appendChild(removeBtn);
            }

            ul.appendChild(li);
          });
          participantsDiv.appendChild(ul);
        }

        // Compose card
        activityCard.appendChild(title);
        activityCard.appendChild(desc);
        activityCard.appendChild(scheduleP);
        activityCard.appendChild(availP);
        activityCard.appendChild(participantsDiv);

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message || "Successfully signed up";
        messageDiv.className = "message success";
        signupForm.reset();

        // Refresh activities so the new participant appears immediately
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "message error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "message error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Handle participant removal (delegated on activities list)
  activitiesList.addEventListener("click", async (event) => {
    const btn = event.target.closest && event.target.closest(".participant-remove");
    if (!btn) return;

    const li = btn.closest("li");
    if (!li) return;

    const email = li.dataset.email;
    const activity = li.dataset.activity;
    if (!email || !activity) return;

    if (!confirm(`Unregister ${email} from ${activity}?`)) return;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        { method: "DELETE" }
      );

      let result = {};
      try {
        result = await response.json();
      } catch (err) {
        // ignore JSON parse errors
      }

      if (response.ok) {
        messageDiv.textContent = result.message || "Participant removed";
        messageDiv.className = "message success";
        messageDiv.classList.remove("hidden");

        // Refresh list to reflect change
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "Failed to remove participant";
        messageDiv.className = "message error";
        messageDiv.classList.remove("hidden");
      }

      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      console.error("Error removing participant:", error);
      messageDiv.textContent = "Failed to remove participant. Please try again.";
      messageDiv.className = "message error";
      messageDiv.classList.remove("hidden");
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    }
  });

  // Initialize app
  fetchActivities();
});
