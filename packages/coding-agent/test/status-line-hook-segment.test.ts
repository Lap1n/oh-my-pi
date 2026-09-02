import { beforeAll, describe, expect, it } from "bun:test";
import { stripVTControlCharacters } from "node:util";
import { Settings, settings } from "@oh-my-pi/pi-coding-agent/config/settings";
import { renderSegment } from "@oh-my-pi/pi-coding-agent/modes/components/status-line/segments";
import type { SegmentContext } from "@oh-my-pi/pi-coding-agent/modes/components/status-line/types";
import { initTheme } from "@oh-my-pi/pi-coding-agent/modes/theme/theme";

beforeAll(async () => {
	await Settings.init();
	await initTheme();
});

function ctxWith(hookStatuses?: readonly string[]): SegmentContext {
	return { hookStatuses } as unknown as SegmentContext;
}

/** The label without ANSI, the theme icon, or any OSC 8 wrapper. */
function label(content: string): string {
	return stripVTControlCharacters(content)
		.replace(/^\S+\s/u, "")
		.trim();
}

describe("hook status-line segment", () => {
	it("is hidden when no hook has published, so carrying it in a preset costs no width", () => {
		expect(renderSegment("hook", ctxWith()).visible).toBe(false);
		expect(renderSegment("hook", ctxWith([])).visible).toBe(false);
		// A hook that clears its status to whitespace is the same as no hook.
		expect(renderSegment("hook", ctxWith(["   "])).visible).toBe(false);
	});

	it("keeps a trailing URL out of the label", () => {
		// The URL is the chip's link target. Left in the label it is both
		// unreadable at bar width and pointless — the chip is already the click.
		const result = renderSegment("hook", ctxWith(["vitrine 3 http://127.0.0.1:7391/s/01a05f8a"]));
		expect(result.visible).toBe(true);
		expect(label(result.content)).toBe("vitrine 3");
		expect(stripVTControlCharacters(result.content)).not.toContain("127.0.0.1");
	});

	it("links the label when hyperlinks are on, and degrades to plain text when off", () => {
		const url = "http://127.0.0.1:7391/s/01a05f8a";
		settings.set("tui.hyperlinks", "always");
		const linked = renderSegment("hook", ctxWith([`vitrine 3 ${url}`])).content;
		expect(linked).toContain(`\x1b]8;`);
		expect(linked).toContain(url);

		settings.set("tui.hyperlinks", "off");
		const plain = renderSegment("hook", ctxWith([`vitrine 3 ${url}`])).content;
		expect(plain).not.toContain("\x1b]8;");
		expect(label(plain)).toBe("vitrine 3");
	});

	it("caps a chatty hook so the context gauge keeps its width", () => {
		const long = "a hook with rather a lot to say about itself and its feelings";
		const rendered = label(renderSegment("hook", ctxWith([long])).content);
		expect(rendered.length).toBeLessThan(long.length);
		expect(rendered.endsWith("…")).toBe(true);
	});

	it("joins several hooks in the key order the component supplied", () => {
		const result = renderSegment("hook", ctxWith(["notes 12", "vitrine 3"]));
		const text = stripVTControlCharacters(result.content);
		expect(text.indexOf("notes 12")).toBeLessThan(text.indexOf("vitrine 3"));
		expect(text).toContain("·");
	});

	it("strips control bytes, so a hook cannot repaint the bar around it", () => {
		// `setStatus` text is arbitrary: a raw ESC would let a hook set colors
		// that outlive its own chip.
		const result = renderSegment("hook", ctxWith(["vitrine\x1b[31m 3"]));
		expect(stripVTControlCharacters(result.content)).toContain("vitrine 3");
		expect(result.content).not.toContain("[31m");
	});
});
