import { EngravingRules } from "./EngravingRules";
import { StaffLine } from "./StaffLine";
import { PointF2D } from "../../Common/DataObjects/PointF2D";
import { VexFlowMeasure } from "./VexFlow/VexFlowMeasure";
import { BoundingBox } from "./BoundingBox";
import { GraphicalStaffEntry } from "./GraphicalStaffEntry";
import { VexFlowGraphicalNote } from "./VexFlow";
import { Note } from "../VoiceData/Note";
/**
 * This class calculates and holds the skyline and bottom line information.
 * It also has functions to update areas of the two lines if new elements are
 * added to the staffline (e.g. measure number, annotations, ...)
 */
export class SkyBottomLineCalculator {
    /** Parent Staffline where the skyline and bottom line is attached */
    private mStaffLineParent: StaffLine;
    /** Internal array for the skyline */
    private mSkyLine: number[];
    /** Internal array for the bottomline */
    private mBottomLine: number[];
    /** Engraving rules for formatting */
    private mRules: EngravingRules;

    /**
     * Create a new object of the calculator
     * @param staffLineParent staffline where the calculator should be attached
     */
    constructor(staffLineParent: StaffLine) {
        this.mStaffLineParent = staffLineParent;
        this.mRules = staffLineParent.ParentMusicSystem.rules;
    }

    /**
     * This method calculates the Sky- and BottomLines for a StaffLine.
     */
    public calculateLines(): void {
        this.mSkyLine = [];
        this.mBottomLine = [];

        // search through all Measures
        for (const measure of this.StaffLineParent.Measures as VexFlowMeasure[]) {
            // must calculate first AbsolutePositions
            measure.PositionAndShape.calculateAbsolutePositionsRecursive(0, 0);
            const measureArrayLength: number = Math.max(Math.ceil(measure.PositionAndShape.Size.width * this.mRules.SamplingUnit), 1);
            const measureSkylineArray: number[] = new Array(measureArrayLength);
            const measureBottomLineArray: number[] = new Array(measureArrayLength);
            for(let idx: number = 0; idx < measureArrayLength; idx++){
                measureSkylineArray[idx] = 0;
                measureBottomLineArray[idx] = 4;
            }
            const beamQueue: Map<Note, number> = new Map();
            for(const child of measure.PositionAndShape.ChildElements){
                const childX: number = child.RelativePosition.x * this.mRules.SamplingUnit;
                const x: number = Math.floor(childX - child.BorderMarginLeft);
                const xEnd: number = Math.ceil(childX + child.BorderMarginRight);
                if(child.BorderMarginTop < 0){
                    for(let idx: number = x; idx < xEnd; idx++){
                        measureSkylineArray[idx] = child.BorderMarginTop;
                    }
                    //Should always be the case.
                    //TODO: This is duplicated for sky and bottom lines. Refactor better
                    if(child.DataObject instanceof GraphicalStaffEntry){
                        for(const gve of child.DataObject.graphicalVoiceEntries){
                            for(const note of gve.notes){
                                if(note instanceof VexFlowGraphicalNote){
                                    //Note has stavenotes which contain the beam slope info
                                    const beamNotes: Note[] = note.sourceNote?.NoteBeam?.Notes;
                                    if(beamNotes?.length > 0){
                                        //We have a beam.
                                        const ourBeamIndex: number = beamNotes.indexOf(note.sourceNote);
                                        switch(ourBeamIndex){
                                            case 0:
                                                beamQueue.set(note.sourceNote, x);
                                                break;
                                            case beamNotes.length-1:
                                                //Find Beam Slope
                                                for(const stavenote of note.vfnote){
                                                    if(typeof stavenote !== "number"){
                                                        //Only check beams on steam direction up
                                                        const staveNoteAsAny: any = (stavenote as any);
                                                        if(staveNoteAsAny?.stem_direction === 1){
                                                            if(!staveNoteAsAny.beam.slope){
                                                                staveNoteAsAny.beam.calculateSlope();
                                                            }
                                                            const slope: number = staveNoteAsAny.beam.slope;
                                                            if(slope){
                                                                let currentX: number = beamQueue.get(beamNotes[0]);
                                                                let prevY: number = measureSkylineArray[currentX];
                                                                //Found the end of the beam, update the skyline range
                                                                for(currentX; currentX < xEnd; currentX++){
                                                                    measureSkylineArray[currentX] = prevY + slope;
                                                                    prevY = measureSkylineArray[currentX];
                                                                }
                                                            }
                                                            break;
                                                        }
                                                    }
                                                }
                                                beamQueue.delete(beamNotes[0]);
                                                break;
                                            default:
                                                break;
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
                if(child.BorderMarginBottom > 4){
                    for(let idx: number = x; idx < Math.ceil(x + child.BorderMarginRight); idx++){
                        measureBottomLineArray[idx] = child.BorderMarginBottom;
                    }
                    //Should always be the case.
                    if(child.DataObject instanceof GraphicalStaffEntry){
                        for(const gve of child.DataObject.graphicalVoiceEntries){
                            for(const note of gve.notes){
                                if(note instanceof VexFlowGraphicalNote){
                                    //Note has stavenotes which contain the beam slope info
                                    const beamNotes: Note[] = note.sourceNote?.NoteBeam?.Notes;
                                    if(beamNotes?.length > 0){
                                        //We have a beam.
                                        const ourBeamIndex: number = beamNotes.indexOf(note.sourceNote);
                                        switch(ourBeamIndex){
                                            case 0:
                                                beamQueue.set(note.sourceNote, x);
                                                break;
                                            case beamNotes.length-1:
                                                //Find Beam Slope
                                                for(const stavenote of note.vfnote){
                                                    if(typeof stavenote !== "number"){
                                                        //Only check beams on steam direction up
                                                        const staveNoteAsAny: any = (stavenote as any);
                                                        if(staveNoteAsAny?.stem_direction === 1){
                                                            if(!staveNoteAsAny.beam.slope){
                                                                staveNoteAsAny.beam.calculateSlope();
                                                            }
                                                            const slope: number = staveNoteAsAny.beam.slope;
                                                            if(slope){
                                                                let currentX: number = beamQueue.get(beamNotes[0]);
                                                                let prevY: number = measureBottomLineArray[currentX];
                                                                //Found the end of the beam, update the skyline range
                                                                for(currentX; currentX < xEnd; currentX++){
                                                                    measureBottomLineArray[currentX] = prevY + slope;
                                                                    prevY = measureBottomLineArray[currentX];
                                                                }
                                                            }
                                                            break;
                                                        }
                                                    }
                                                }
                                                beamQueue.delete(beamNotes[0]);
                                                break;
                                            default:
                                                break;
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
            this.mSkyLine.push(...measureSkylineArray);
            this.mBottomLine.push(...measureBottomLineArray);
        }
    }

    /**
     * This method updates the SkyLine for a given Wedge.
     * @param start Start point of the wedge (the point where both lines meet)
     * @param end End point of the wedge (the end of the most extreme line: upper line for skyline, lower line for bottomline)
     */
    public updateSkyLineWithWedge(start: PointF2D, end: PointF2D): void {
        // FIXME: Refactor if wedges will be added. Current status is that vexflow will be used for this
        let startIndex: number = Math.floor(start.x * this.SamplingUnit);
        let endIndex: number = Math.ceil(end.x * this.SamplingUnit);

        let slope: number = (end.y - start.y) / (end.x - start.x);

        if (endIndex - startIndex <= 1) {
            endIndex++;
            slope = 0;
        }

        if (startIndex < 0) {
            startIndex = 0;
        }
        if (startIndex >= this.BottomLine.length) {
            startIndex = this.BottomLine.length - 1;
        }
        if (endIndex < 0) {
            endIndex = 0;
        }
        if (endIndex >= this.BottomLine.length) {
            endIndex = this.BottomLine.length;
        }

        this.SkyLine[startIndex] = start.y;
        for (let i: number = startIndex + 1; i < Math.min(endIndex, this.SkyLine.length); i++) {
            this.SkyLine[i] = this.SkyLine[i - 1] + slope / this.SamplingUnit;
        }
    }

    /**
     * This method updates the BottomLine for a given Wedge.
     * @param start Start point of the wedge
     * @param end End point of the wedge
     */
    public updateBottomLineWithWedge(start: PointF2D, end: PointF2D): void {
        // FIXME: Refactor if wedges will be added. Current status is that vexflow will be used for this
        let startIndex: number = Math.floor(start.x * this.SamplingUnit);
        let endIndex: number = Math.ceil(end.x * this.SamplingUnit);

        let slope: number = (end.y - start.y) / (end.x - start.x);
        if (endIndex - startIndex <= 1) {
            endIndex++;
            slope = 0;
        }

        if (startIndex < 0) {
            startIndex = 0;
        }
        if (startIndex >= this.BottomLine.length) {
            startIndex = this.BottomLine.length - 1;
        }
        if (endIndex < 0) {
            endIndex = 0;
        }
        if (endIndex >= this.BottomLine.length) {
            endIndex = this.BottomLine.length;
        }

        this.BottomLine[startIndex] = start.y;
        for (let i: number = startIndex + 1; i < endIndex; i++) {
            this.BottomLine[i] = this.BottomLine[i - 1] + slope / this.SamplingUnit;
        }
    }

    /**
     * This method updates the SkyLine for a given range with a given value
     * //param  to update the SkyLine for
     * @param start Start index of the range
     * @param end End index of the range
     * @param value ??
     */
    public updateSkyLineInRange(startIndex: number, endIndex: number, value: number): void {
        this.updateInRange(this.mSkyLine, startIndex, endIndex, value);
    }

    /**
     * This method updates the BottomLine for a given range with a given value
     * @param  to update the BottomLine for
     * @param start Start index of the range
     * @param end End index of the range (excluding)
     * @param value ??
     */
    public updateBottomLineInRange(startIndex: number, endIndex: number, value: number): void {
        this.updateInRange(this.BottomLine, startIndex, endIndex, value);
    }

    /**
     * Resets a SkyLine in a range to its original value
     * @param  to reset the SkyLine in
     * @param startIndex Start index of the range
     * @param endIndex End index of the range (excluding)
     */
    public resetSkyLineInRange(startIndex: number, endIndex: number): void {
        this.updateInRange(this.SkyLine, startIndex, endIndex);
    }

    /**
     * Resets a bottom line in a range to its original value
     * @param  to reset the bottomline in
     * @param startIndex Start index of the range
     * @param endIndex End index of the range
     */
    public resetBottomLineInRange(startIndex: number, endIndex: number): void {
        this.setInRange(this.BottomLine, startIndex, endIndex);
    }

    /**
     * Update the whole skyline with a certain value
     * @param value value to be set
     */
    public setSkyLineWithValue(value: number): void {
        this.SkyLine.forEach(sl => sl = value);
    }

    /**
     * Update the whole bottomline with a certain value
     * @param value value to be set
     */
    public setBottomLineWithValue(value: number): void {
        this.BottomLine.forEach(bl => bl = value);
    }

    public getLeftIndexForPointX(x: number, length: number): number {
        const index: number = Math.floor(x * this.SamplingUnit);

        if (index < 0) {
            return 0;
        }

        if (index >= length) {
            return length - 1;
        }

        return index;
    }

    public getRightIndexForPointX(x: number, length: number): number {
        const index: number = Math.ceil(x * this.SamplingUnit);

        if (index < 0) {
            return 0;
        }

        if (index >= length) {
            return length - 1;
        }

        return index;
    }

    /**
     * This method updates the StaffLine Borders with the Sky- and BottomLines Min- and MaxValues.
     */
    public updateStaffLineBorders(): void {
        this.mStaffLineParent.PositionAndShape.BorderTop = this.getSkyLineMin();
        this.mStaffLineParent.PositionAndShape.BorderMarginTop = this.getSkyLineMin();
        this.mStaffLineParent.PositionAndShape.BorderBottom = this.getBottomLineMax();
        this.mStaffLineParent.PositionAndShape.BorderMarginBottom = this.getBottomLineMax();
    }

    /**
     * This method finds the minimum value of the SkyLine.
     * @param staffLine StaffLine to apply to
     */
    public getSkyLineMin(): number {
        return Math.min(...this.SkyLine.filter(s => !isNaN(s)));
    }

    public getSkyLineMinAtPoint(point: number): number {
        const index: number = Math.round(point * this.SamplingUnit);
        return this.mSkyLine[index];
    }

    /**
     * This method finds the SkyLine's minimum value within a given range.
     * @param staffLine Staffline to apply to
     * @param startIndex Starting index
     * @param endIndex End index (including)
     */
    public getSkyLineMinInRange(startIndex: number, endIndex: number): number {
        return this.getMinInRange(this.SkyLine, startIndex, endIndex);
    }

    /**
     * This method finds the maximum value of the BottomLine.
     * @param staffLine Staffline to apply to
     */
    public getBottomLineMax(): number {
        return Math.max(...this.BottomLine.filter(s => !isNaN(s)));
    }

    public getBottomLineMaxAtPoint(point: number): number {
        const index: number = Math.round(point * this.SamplingUnit);
        return this.mBottomLine[index];
    }

    /**
     * This method finds the BottomLine's maximum value within a given range.
     * @param staffLine Staffline to find the max value in
     * @param startIndex Start index of the range
     * @param endIndex End index of the range (excluding)
     */
    public getBottomLineMaxInRange(startIndex: number, endIndex: number): number {
        return this.getMaxInRange(this.BottomLine, startIndex, endIndex);
    }

    /**
     * This method returns the maximum value of the bottom line around a specific
     * bounding box. Will return undefined if the bounding box is not valid or inside staffline
     * @param boundingBox Bounding box where the maximum should be retrieved from
     * @returns Maximum value inside bounding box boundaries or undefined if not possible
     */
    public getBottomLineMaxInBoundingBox(boundingBox: BoundingBox): number {
        //TODO: Actually it should be the margin. But that one is not implemented
        const startPoint: number = Math.floor(boundingBox.AbsolutePosition.x + boundingBox.BorderLeft);
        const endPoint: number = Math.ceil(boundingBox.AbsolutePosition.x + boundingBox.BorderRight);
        return this.getMaxInRange(this.mBottomLine, startPoint, endPoint);
    }

    //#region Private methods

    /**
     * Updates sky- and bottom line with a boundingBox and its children
     * @param boundingBox Bounding box to be added
     * @param topBorder top
     */
    public updateWithBoundingBoxRecursively(boundingBox: BoundingBox): void {
        if (boundingBox.ChildElements && boundingBox.ChildElements.length > 0) {
            for(const child of boundingBox.ChildElements){
                this.updateWithBoundingBoxRecursively(child);
            }
        } else {
            const currentTopBorder: number = boundingBox.BorderTop + boundingBox.AbsolutePosition.y;
            const currentBottomBorder: number = boundingBox.BorderBottom + boundingBox.AbsolutePosition.y;

            if (currentTopBorder < 0) {
                const startPoint: number = Math.floor(boundingBox.AbsolutePosition.x + boundingBox.BorderLeft);
                const endPoint: number = Math.ceil(boundingBox.AbsolutePosition.x + boundingBox.BorderRight) ;

                this.updateInRange(this.mSkyLine, startPoint, endPoint, currentTopBorder);
            } else if (currentBottomBorder > this.StaffLineParent.StaffHeight) {
                const startPoint: number = Math.floor(boundingBox.AbsolutePosition.x + boundingBox.BorderLeft);
                const endPoint: number = Math.ceil(boundingBox.AbsolutePosition.x + boundingBox.BorderRight);

                this.updateInRange(this.mBottomLine, startPoint, endPoint, currentBottomBorder);
            }
        }
    }

    /**
     * Update an array with the value given inside a range. NOTE: will only be updated if value > oldValue
     * @param array Array to fill in the new value
     * @param startIndex start index to begin with (default: 0)
     * @param endIndex end index of array (excluding, default: array length)
     * @param value value to fill in (default: 0)
     */
    private updateInRange(array: number[], startIndex: number = 0, endIndex: number = array.length, value: number = 0): void {
        startIndex = Math.floor(startIndex * this.SamplingUnit);
        endIndex = Math.ceil(endIndex * this.SamplingUnit);

        if (endIndex < startIndex) {
            throw new Error("start index of line is greater than the end index");
        }

        if (startIndex < 0) {
            startIndex = 0;
        }

        if (endIndex > array.length) {
            endIndex = array.length;
        }

        for (let i: number = startIndex; i < endIndex; i++) {
            array[i] = Math.abs(value) > Math.abs(array[i]) ? value : array[i];
        }
    }

    /**
     * Sets the value given to the range inside the array. NOTE: will always update the value
     * @param array Array to fill in the new value
     * @param startIndex start index to begin with (default: 0)
     * @param endIndex end index of array (excluding, default: array length)
     * @param value value to fill in (default: 0)
     */
    private setInRange(array: number[], startIndex: number = 0, endIndex: number = array.length, value: number = 0): void {
        startIndex = Math.floor(startIndex * this.SamplingUnit);
        endIndex = Math.ceil(endIndex * this.SamplingUnit);

        if (endIndex < startIndex) {
            throw new Error("start index of line is greater then the end index");
        }

        if (startIndex < 0) {
            startIndex = 0;
        }

        if (endIndex > array.length) {
            endIndex = array.length;
        }

        for (let i: number = startIndex; i < endIndex; i++) {
            array[i] = value;
        }
    }
    /**
     * Get all values of the selected line inside the given range
     * @param skyBottomArray Skyline or bottom line
     * @param startIndex start index
     * @param endIndex end index (including)
     */
    private getMinInRange(skyBottomArray: number[], startIndex: number, endIndex: number): number {
        startIndex = Math.floor(startIndex * this.SamplingUnit);
        endIndex = Math.ceil(endIndex * this.SamplingUnit);

        if (!skyBottomArray) {
            // Highly questionable
            return Number.MAX_VALUE;
        }

        if (startIndex < 0) {
            startIndex = 0;
        }
        if (startIndex >= skyBottomArray.length) {
            startIndex = skyBottomArray.length - 1;
        }
        if (endIndex < 0) {
            endIndex = 0;
        }
        if (endIndex >= skyBottomArray.length) {
            endIndex = skyBottomArray.length;
        }

        if (startIndex >= 0 && endIndex <= skyBottomArray.length) {
            return Math.min(...skyBottomArray.slice(startIndex, endIndex + 1)); // slice does not include end (index)
        }
    }

    /**
     * Get the maximum value inside the given indices
     * @param skyBottomArray Skyline or bottom line
     * @param startIndex start index
     * @param endIndex end index (including)
     */
    private getMaxInRange(skyBottomArray: number[], startIndex: number, endIndex: number): number {
        startIndex = Math.floor(startIndex * this.SamplingUnit);
        endIndex = Math.ceil(endIndex * this.SamplingUnit);

        if (!skyBottomArray) {
            // Highly questionable
            return Number.MIN_VALUE;
        }

        if (startIndex < 0) {
            startIndex = 0;
        }
        if (startIndex >= skyBottomArray.length) {
            startIndex = skyBottomArray.length - 1;
        }
        if (endIndex < 0) {
            endIndex = 0;
        }
        if (endIndex >= skyBottomArray.length) {
            endIndex = skyBottomArray.length;
        }

        if (startIndex >= 0 && endIndex <= skyBottomArray.length) {
            return Math.max(...skyBottomArray.slice(startIndex, endIndex + 1)); // slice does not include end (index)
        }
    }
    // FIXME: What does this do here?
    // private isStaffLineUpper(): boolean {
    //     const instrument: Instrument = this.StaffLineParent.ParentStaff.ParentInstrument;

    //     if (this.StaffLineParent.ParentStaff === instrument.Staves[0]) {
    //         return true;
    //     } else {
    //         return false;
    //     }
    // }
    // #endregion

    //#region Getter Setter
    /** Sampling units that are used to quantize the sky and bottom line  */
    get SamplingUnit(): number {
        return this.mRules.SamplingUnit;
    }

    /** Parent staffline where the skybottomline calculator is attached to */
    get StaffLineParent(): StaffLine {
        return this.mStaffLineParent;
    }

    /** Get the plain skyline array */
    get SkyLine(): number[] {
        return this.mSkyLine;
    }

    /** Get the plain bottomline array */
    get BottomLine(): number[] {
        return this.mBottomLine;
    }
    //#endregion
}
