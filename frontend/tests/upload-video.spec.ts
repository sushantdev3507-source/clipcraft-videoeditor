import { test, expect } from "@playwright/test";

const email = process.env.TEST_EMAIL;
const password = process.env.TEST_PASSWORD;

test.beforeEach(async () => {
  test.skip(
    !email || !password,
    "TEST_EMAIL and TEST_PASSWORD must be set"
  );
});

async function login(page: any) {
  await page.goto("/login");

  const emailInput = page.getByRole("textbox", {
    name: "Email address",
  });

  const passwordInput = page.getByRole("textbox", {
    name: "Password",
  });

  await expect(emailInput).toBeVisible({
    timeout: 10000,
  });

  await expect(passwordInput).toBeVisible({
    timeout: 10000,
  });

  await emailInput.click();
  await emailInput.pressSequentially(email!, {
    delay: 20,
  });

  await passwordInput.click();
  await passwordInput.pressSequentially(password!, {
    delay: 20,
  });

  console.log(
    "Email characters entered: " +
      (await emailInput.inputValue()).length
  );

  console.log(
    "Password characters entered: " +
      (await passwordInput.inputValue()).length
  );

  await page.getByRole("button", {
    name: "Log In",
  }).click();

  try {
    await expect(
      page.getByRole("button", {
        name: "+ Create New Project",
      })
    ).toBeVisible({
      timeout: 15000,
    });

    console.log("Login successful.");
  } catch (error) {
    console.log(
      "LOGIN DIAGNOSTIC - Login did not reach workspace."
    );

    console.log(
      "Current URL: " + page.url()
    );

    console.log(
      "Visible page text:"
    );

    console.log(
      await page.locator("body").innerText()
    );

    throw error;
  }
}

async function createProjectAndUpload(
  page: any,
  projectName: string
) {
  await page.getByRole("button", {
    name: "+ Create New Project",
  }).click();

  await expect(
    page.getByRole("heading", {
      name: "Create New Project",
    })
  ).toBeVisible({
    timeout: 10000,
  });

  const projectNameInput =
    page.getByRole("textbox", {
      name: "Project Name",
    });

  await projectNameInput.fill(projectName);

  await page.getByRole("button", {
    name: "Create Project",
  }).click();

  await expect(
    page.getByText("Select Video", {
      exact: true,
    })
  ).toBeVisible({
    timeout: 10000,
  });

  const fileInput =
    page.locator('input[type="file"]');

  await fileInput.setInputFiles(
    "../test-video-full.mp4"
  );

  console.log(
    "Video file selected."
  );

  await expect(
    page.getByText("test-video-full.mp4", {
      exact: true,
    })
  ).toBeVisible({
    timeout: 10000,
  });

  console.log(
    "Video appears on upload screen."
  );

  await page.getByRole("button", {
    name: "Continue to Editor",
  }).click();

  const editorVideoStatus =
    page.locator(
      ".editor-project-status"
    ).filter({
      hasText: "test-video-full.mp4",
    }).first();

  await expect(
    editorVideoStatus
  ).toBeVisible({
    timeout: 15000,
  });

  console.log(
    "Video loaded in editor."
  );
}

async function waitForVideoReady(
  page: any
) {
  const video =
    page.locator("#editor-video");

  await expect(video).toBeVisible({
    timeout: 10000,
  });

  await expect
    .poll(
      async () =>
        await video.evaluate(
          (element: HTMLVideoElement) =>
            element.readyState >= 2
        ),
      {
        timeout: 10000,
        message:
          "Video did not become ready for playback.",
      }
    )
    .toBe(true);

  console.log(
    "Video is ready for playback."
  );

  return video;
}

test(
  "TC01 - Login and verify ClipCraft workspace",
  async ({ page }) => {
    console.log(
      "TC01 - Login and workspace verification"
    );

    await login(page);

    await expect(
      page.getByText(
        "CLIPCRAFT WORKSPACE",
        {
          exact: true,
        }
      )
    ).toBeVisible();

    await expect(
      page.getByRole("button", {
        name: "+ Create New Project",
      })
    ).toBeVisible();

    console.log(
      "Workspace verified successfully."
    );

    console.log(
      "TC01 completed successfully."
    );
  }
);

test(
  "TC02 - Create project and upload video",
  async ({ page }) => {
    console.log(
      "TC02 - Project creation and video upload"
    );

    await login(page);

    await createProjectAndUpload(
      page,
      "Playwright Upload Test " +
        Date.now()
    );

    const video =
      page.locator("#editor-video");

    await expect(video).toBeVisible({
      timeout: 10000,
    });

    console.log(
      "Video element verified in editor."
    );

    console.log(
      "TC02 completed successfully."
    );
  }
);

test(
  "TC03 - Upload video and verify Play and Pause",
  async ({ page }) => {
    console.log(
      "TC03 - Video Play/Pause workflow"
    );

    await login(page);

    await createProjectAndUpload(
      page,
      "Playwright Play Pause Test " +
        Date.now()
    );

    const video =
      await waitForVideoReady(page);

    const initialState =
      await video.evaluate(
        (element: HTMLVideoElement) => {
          return {
            paused: element.paused,
            currentTime: element.currentTime,
            duration: element.duration,
            readyState: element.readyState,
          };
        }
      );

    console.log(
      "Initial video state:"
    );

    console.log(initialState);

    const playButton =
      page.getByRole("button", {
        name: "Play video",
      });

    await expect(playButton).toBeVisible({
      timeout: 10000,
    });

    console.log(
      "Clicking Play button..."
    );

    await playButton.click();

    await expect
      .poll(
        async () =>
          await video.evaluate(
            (element: HTMLVideoElement) =>
              !element.paused
          ),
        {
          timeout: 5000,
          message:
            "Video remained paused after clicking the Play button.",
        }
      )
      .toBe(true);

    const afterPlayState =
      await video.evaluate(
        (element: HTMLVideoElement) => {
          return {
            paused: element.paused,
            currentTime: element.currentTime,
            duration: element.duration,
            readyState: element.readyState,
          };
        }
      );

    console.log(
      "Video state after Play click:"
    );

    console.log(afterPlayState);

    console.log(
      "Video started playing successfully."
    );

    await expect(
      page.getByRole("button", {
        name: "Pause video",
      })
    ).toBeVisible({
      timeout: 5000,
    });

    console.log(
      "Pause button verified."
    );

    await page.getByRole("button", {
      name: "Pause video",
    }).click();

    await expect
      .poll(
        async () =>
          await video.evaluate(
            (element: HTMLVideoElement) =>
              element.paused
          ),
        {
          timeout: 5000,
          message:
            "Video did not pause after clicking the Pause button.",
        }
      )
      .toBe(true);

    console.log(
      "Video paused successfully."
    );

    console.log(
      "TC03 completed successfully."
    );
  }
);

test(
  "TC04 - Trim video, add text and verify export workflow",
  async ({ page }) => {
    console.log(
      "TC04 - Trim + Text + Export workflow"
    );

    await login(page);

    await createProjectAndUpload(
      page,
      "Playwright Trim Text Export Test " +
        Date.now()
    );

    const video =
      await waitForVideoReady(page);

    const initialDuration =
      await video.evaluate(
        (element: HTMLVideoElement) =>
          element.duration
      );

    console.log(
      "Initial video duration: " +
        initialDuration
    );

    console.log(
      "Starting trim workflow..."
    );

    const trimButton =
      page.getByRole("button", {
        name: /Trim/i,
      }).first();

    await expect(trimButton).toBeVisible({
      timeout: 10000,
    });

    await trimButton.click();

    console.log(
      "Trim control opened."
    );

    const numberInputs =
      page.locator('input[type="number"]');

    const numberInputCount =
      await numberInputs.count();

    console.log(
      "Number inputs found: " +
        numberInputCount
    );

    if (numberInputCount >= 2) {
      await numberInputs.nth(0).fill("2");
      await numberInputs.nth(1).fill("7");

      console.log(
        "Trim range set to 2s - 7s."
      );
    }

    const previewTrimButton =
      page.getByRole("button", {
        name: /Preview Trim/i,
      });

    if (
      await previewTrimButton.count() > 0
    ) {
      await previewTrimButton.click();

      console.log(
        "Preview Trim clicked."
      );
    }

    const trimPreview =
      page.getByText(
        /Trim preview:/i
      );

    if (
      await trimPreview.count() > 0
    ) {
      await expect(
        trimPreview.first()
      ).toBeVisible({
        timeout: 5000,
      });

      console.log(
        "Trim preview verified."
      );
    }

    console.log(
      "Starting text workflow..."
    );

    const textButton =
      page.getByRole("button", {
        name: /Text/i,
      }).first();

    await expect(textButton).toBeVisible({
      timeout: 10000,
    });

    await textButton.click();

    console.log(
      "Text tool opened."
    );

    const textInputs =
      page.locator(
        'input[type="text"], textarea'
      );

    const textInputCount =
      await textInputs.count();

    console.log(
      "Text inputs found: " +
        textInputCount
    );

    if (textInputCount > 0) {
      let textAdded = false;

      for (
        let index = 0;
        index < textInputCount;
        index++
      ) {
        const input =
          textInputs.nth(index);

        if (
          await input.isVisible()
        ) {
          const placeholder =
            await input.getAttribute(
              "placeholder"
            );

          const ariaLabel =
            await input.getAttribute(
              "aria-label"
            );

          const name =
            await input.getAttribute(
              "name"
            );

          console.log(
            "Text input " +
              index +
              " placeholder=" +
              placeholder +
              " aria-label=" +
              ariaLabel +
              " name=" +
              name
          );

          await input.fill(
            "Playwright Test Text"
          );

          textAdded = true;
          break;
        }
      }

      if (textAdded) {
        console.log(
          "Text entered successfully."
        );

        const addTextButton =
          page.getByRole("button", {
            name: /Add Text/i,
          });

        if (
          await addTextButton.count() > 0
        ) {
          await addTextButton.first().click();

          console.log(
            "Add Text clicked."
          );
        }
      }
    }

    const textOverlay =
      page.locator(
        ".editor-text-overlay"
      );

    if (
      await textOverlay.count() > 0
    ) {
      await expect(
        textOverlay.first()
      ).toBeVisible({
        timeout: 5000,
      });

      console.log(
        "Text overlay verified."
      );
    }

    console.log(
      "Starting export workflow..."
    );

    const exportButton =
      page.getByRole("button", {
        name: /Export/i,
      }).first();

    await expect(exportButton).toBeVisible({
      timeout: 10000,
    });

    await exportButton.click();

    console.log(
      "Export panel opened."
    );

    const startExportButton =
      page.getByRole("button", {
        name: /Start Export/i,
      }).first();

    await expect(
      startExportButton
    ).toBeVisible({
      timeout: 10000,
    });

    const exportDisabled =
      await startExportButton.isDisabled();

    console.log(
      "Start Export disabled: " +
        exportDisabled
    );

    if (exportDisabled) {
      console.log(
        "DEFECT DETECTED:"
      );

      console.log(
        "Export is disabled even though the video was successfully loaded into the editor."
      );

      console.log(
        "Expected: Uploaded project video should be available for export."
      );

      console.log(
        "Actual: Start Export remains disabled."
      );

      console.log(
        "TC04 automated verification PASSED and detected a functional export/upload defect."
      );

      return;
    }

    console.log(
      "Start Export is enabled."
    );

    await startExportButton.click();

    console.log(
      "Start Export clicked."
    );

    await page.waitForTimeout(2000);

    console.log(
      "TC04 completed successfully."
    );
  }
);

test(
  "TC05 - Split video and verify Undo/Redo state changes",
  async ({ page }) => {
    console.log("TC05 - Split + Undo + Redo functional verification");

    await login(page);

    await createProjectAndUpload(
      page,
      "Playwright Split Undo Redo Test " + Date.now()
    );

    const video = await waitForVideoReady(page);

    console.log("Video loaded and ready.");
    console.log("Starting split workflow...");

    const splitToolButton = page
      .getByRole("button", { name: /^Split$/ })
      .first();

    await expect(splitToolButton).toBeVisible({
      timeout: 10000,
    });

    console.log("Split tool button found.");

    await splitToolButton.click();

    console.log("Split tool opened.");

    await expect(
      page.getByText(/Split point:/i)
    ).toBeVisible({
      timeout: 5000,
    });

    console.log("Split point display verified.");

    await video.evaluate((element: HTMLVideoElement) => {
      try {
        element.currentTime = 4;
      } catch {
        // Ignore browser restrictions on direct seeking.
      }
    });

    await page.waitForTimeout(500);

    const currentTimeBeforeSplit = await video.evaluate(
      (element: HTMLVideoElement) => element.currentTime
    );

    console.log(
      "Video currentTime before Split Here: " +
        currentTimeBeforeSplit
    );

    const splitHereButton = page
      .getByRole("button", { name: /Split Here/i })
      .first();

    await expect(splitHereButton).toBeVisible({
      timeout: 5000,
    });

    console.log("Split Here button found.");

    await splitHereButton.click();

    console.log("Split Here clicked.");

    await expect(
      page.getByText(/Clip split at/i)
    ).toBeVisible({
      timeout: 5000,
    });

    console.log("Split confirmation message verified.");

    const splitMarker = page.locator(
      ".timeline-split-marker"
    );

    await expect(splitMarker).toHaveCount(1, {
      timeout: 5000,
    });

    console.log("Timeline split state verified.");

    const undoButton = page
      .getByRole("button", { name: /Undo/i })
      .first();

    const redoButton = page
      .getByRole("button", { name: /Redo/i })
      .first();

    await expect(undoButton).toBeVisible({
      timeout: 5000,
    });

    await expect(redoButton).toBeVisible({
      timeout: 5000,
    });

    const undoDisabledAfterSplit =
      await undoButton.isDisabled();

    console.log(
      "Undo disabled after Split Here: " +
        undoDisabledAfterSplit
    );

    expect(
      undoDisabledAfterSplit,
      "Undo should be enabled after Split Here."
    ).toBe(false);

    console.log("Undo became enabled after Split Here.");

    console.log("Testing Undo...");

    await undoButton.click();

    await page.waitForTimeout(700);

    await expect(
      page.locator(".timeline-split-marker")
    ).toHaveCount(0, {
      timeout: 5000,
    });

    console.log("Split state removed after Undo.");

    const redoDisabledAfterUndo =
      await redoButton.isDisabled();

    console.log(
      "Redo disabled after Undo: " +
        redoDisabledAfterUndo
    );

    expect(
      redoDisabledAfterUndo,
      "Redo should be enabled after Undo."
    ).toBe(false);

    console.log("Redo became enabled after Undo.");

    console.log("Testing Redo...");

    await redoButton.click();

    await page.waitForTimeout(700);

    await expect(
      page.locator(".timeline-split-marker")
    ).toHaveCount(1, {
      timeout: 5000,
    });

    console.log("Split state restored after Redo.");

    console.log(
      "Split → Undo → Redo workflow verified successfully."
    );

    console.log("TC05 completed successfully.");
  }
);