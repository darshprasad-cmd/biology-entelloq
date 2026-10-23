/* Existing workflow checks explicitly opt out through the real first-visit UI.
 * Dedicated CBSE checks verify onboarding, persistence, focus and class routing. */
async function dismissCBSE(page) {
 const dialog=page.locator('#bio-cbse');
 await dialog.waitFor({state:'attached',timeout:30000});
 if(await dialog.evaluate(node=>node.open)) {
  const skip=dialog.getByRole('button',{name:'Skip for now',exact:true});
  if(await skip.count()) await skip.click();
 }
}
module.exports={dismissCBSE};
